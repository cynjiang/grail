// Vercel Function.
//   GET /api/metadata?url=<page>               -> { title, image, price, siteName }
//   GET /api/metadata?image=<url>&ref=<page>   -> proxies the image bytes (avoids CORS/hotlink blocks)
const BROWSER = {
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'upgrade-insecure-requests': '1',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
}
// stores that block normal-looking server traffic often still serve link previews to social crawlers
const CRAWLERS = [
  { 'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', accept: '*/*' },
  { 'user-agent': 'Twitterbot/1.0', accept: '*/*' },
  { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', accept: '*/*' },
]
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' }

interface Info {
  title: string
  image: string
  price: number | null
  siteName: string
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

// read attribute values properly: content="Women's Henley" must not stop at the apostrophe
function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
  return m ? (m[1] ?? m[2]) : undefined
}

function metaMap(html: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(m[0], 'property') ?? attr(m[0], 'name'))?.toLowerCase()
    const content = attr(m[0], 'content')
    if (key && content && !out.has(key)) out.set(key, decode(content))
  }
  return out
}

function findProduct(html: string): any {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const nodes = [JSON.parse(m[1])].flat().flatMap((x: any) => x?.['@graph'] ?? [x])
      const p = nodes.find((x: any) => [x?.['@type']].flat().includes('Product'))
      if (p) return p
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return {}
}

// stores like hollister put the picture/price in scripts instead of meta tags
function fallbackImage(html: string): string | undefined {
  const preload = html.match(/<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/i)?.[1]
  if (preload) return decode(preload)
  return html.match(/https?:\/\/img\.hollisterco\.com\/is\/image\/[^"'\s)]+/i)?.[0]
}

function fallbackPrice(html: string): number | null {
  const m = html.match(/"(?:salePrice|offerPrice|listPrice|price)"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i)
  return m?.[1] ? Number(m[1]) : null
}

// "Women's Logo Graphic Henley | Women's Tops | HollisterCo.com" -> "Women's Logo Graphic Henley"
const cleanTitle = (t: string) =>
  decode(t)
    .split(/\s+[|•–—]\s+/)[0]
    .replace(/\s+/g, ' ')
    .trim()

// bot-wall pages have a <title> too: never save those as the product name
const BLOCKED = /access denied|just a moment|attention required|are you a (human|robot)|captcha|verify you are|403 forbidden|pardon our interruption|request blocked/i

function parse(html: string, page: string): Info {
  const m = metaMap(html)
  const ld = findProduct(html)
  const offer = [ld.offers].flat()[0] ?? {}
  const ldImg = [ld.image].flat()[0]
  const rawTitle =
    m.get('og:title') ?? m.get('twitter:title') ?? ld.name ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? ''
  const rawImg =
    m.get('og:image:secure_url') ??
    m.get('og:image') ??
    m.get('twitter:image') ??
    m.get('twitter:image:src') ??
    (typeof ldImg === 'string' ? ldImg : ldImg?.url) ??
    fallbackImage(html)
  let image = ''
  try {
    image = rawImg ? new URL(rawImg, page).href : ''
  } catch {
    /* bad image url */
  }
  const title = cleanTitle(String(rawTitle))
  const price =
    Number(
      String(
        m.get('product:price:amount') ?? m.get('og:price:amount') ?? offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price ?? '',
      ).replace(/[^0-9.]/g, ''),
    ) || fallbackPrice(html)
  return { title: BLOCKED.test(title) || /^pinterest$/i.test(title) ? '' : title, image, price, siteName: m.get('og:site_name') ?? '' }
}

async function direct(url: string, headers: Record<string, string>): Promise<Info> {
  const r = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(4500) })
  if (!r.ok) throw new Error('status ' + r.status)
  const info = parse((await r.text()).slice(0, 900_000), r.url || url)
  if (!info.title && !info.image) throw new Error('nothing useful')
  return info
}

const host = (u: string) => new URL(u).hostname.replace(/^www\./, '')
const isPinterest = (u: string) => /(^|\.)pinterest\.[a-z.]+$|^pin\.it$/i.test(host(u))

// pinterest thumbnails are tiny (/236x/): ask for the bigger copy of the same file
const bigPin = (u: string) => u.replace(/(i\.pinimg\.com)\/(?:\d+x\d*|\d+x)\//, '$1/736x/')

// pinterest's own oEmbed endpoint is the most reliable way to get a pin's picture
async function pinterest(url: string): Promise<Info> {
  let u = url
  if (host(u) === 'pin.it') u = (await fetch(u, { redirect: 'follow', headers: BROWSER, signal: AbortSignal.timeout(4500) })).url
  const r = await fetch('https://widgets.pinterest.com/oembed.json?url=' + encodeURIComponent(u), {
    headers: BROWSER,
    signal: AbortSignal.timeout(4500),
  })
  if (!r.ok) throw new Error('oembed ' + r.status)
  const j: any = await r.json()
  if (!j.thumbnail_url) throw new Error('no thumbnail')
  return { title: String(j.title ?? ''), image: bigPin(j.thumbnail_url), price: null, siteName: 'Pinterest' }
}

// last resort: a link-preview service that opens the page in a real browser (free tier, rate limited)
async function microlink(url: string): Promise<Info> {
  const r = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(5000) })
  const j: any = await r.json()
  const d = j?.data
  if (j?.status !== 'success' || !d) throw new Error('microlink failed')
  const title = cleanTitle(String(d.title ?? ''))
  return {
    title: BLOCKED.test(title) ? '' : title,
    image: d.image?.url ?? '',
    price: null,
    siteName: d.publisher ?? '',
  }
}

async function lookup(url: string): Promise<Info> {
  const attempts: Promise<Info>[] = [BROWSER, ...CRAWLERS].map((h) => direct(url, h))
  if (isPinterest(url)) attempts.push(pinterest(url))
  const done = (await Promise.allSettled(attempts)).flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  let best: Info = {
    title: done.find((d) => d.title)?.title ?? '',
    image: done.find((d) => d.image)?.image ?? '',
    price: done.find((d) => d.price)?.price ?? null,
    siteName: done.find((d) => d.siteName)?.siteName ?? '',
  }
  if (!best.title || !best.image) {
    try {
      const ml = await microlink(url)
      best = { ...best, title: best.title || ml.title, image: best.image || ml.image, siteName: best.siteName || ml.siteName }
    } catch {
      /* keep whatever the direct attempts found */
    }
  }
  return best
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams
  const image = p.get('image')
  const url = p.get('url')
  try {
    if (image) {
      const ref = p.get('ref') ?? (isPinterest(image) || host(image).endsWith('pinimg.com') ? 'https://www.pinterest.com/' : '')
      const r = await fetch(bigPin(image), {
        headers: { ...BROWSER, accept: 'image/*,*/*;q=0.8', ...(ref ? { referer: ref } : {}) },
        signal: AbortSignal.timeout(8000),
      })
      if (!r.ok) throw new Error('image fetch failed')
      return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type') ?? 'image/jpeg' } })
    }
    if (!url) throw new Error('missing url')
    return Response.json(await lookup(url), { headers: JSON_HEADERS })
  } catch {
    // never surface scraper failures: the app falls back to manual entry
    return image ? new Response(null, { status: 502 }) : Response.json({}, { headers: JSON_HEADERS })
  }
}

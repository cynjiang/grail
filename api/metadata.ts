const UA = {
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  accept: 'text/html,application/xhtml+xml,image/*,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
}
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' }

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&apos;/g, "'")
    .trim()

function cleanTitle(raw: string): string {
  const cleaned = decode(raw)
  const parts = cleaned.split(/\s+[|—–]\s+|\s+-\s+/)
  return parts[0]?.trim() || cleaned
}

function meta(html: string, key: string): string | undefined {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i')
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i')
  const m = html.match(a) ?? html.match(b)
  return m?.[1] ? decode(m[1]) : undefined
}

function findProduct(html: string): Record<string, any> {
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

function fallbackImage(html: string): string | undefined {
  const preload = html.match(/<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/i)?.[1]
  if (preload) return preload
  const cdn = html.match(/https?:\/\/img\.hollisterco\.com\/is\/image\/[^"'\s)]+/i)?.[0]
  if (cdn) return cdn
  return undefined
}

function fallbackPrice(html: string): number | null {
  const m = html.match(/"(?:salePrice|offerPrice|listPrice|price)"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i)
  return m?.[1] ? Number(m[1]) : null
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams
  const image = p.get('image')
  const url = p.get('url')
  try {
    if (image) {
      const r = await fetch(image, { headers: UA, signal: AbortSignal.timeout(8000) })
      if (!r.ok) throw new Error('image fetch failed')
      return new Response(r.body, {
        headers: { 'content-type': r.headers.get('content-type') ?? 'image/jpeg' },
      })
    }
    if (!url) throw new Error('missing url')
    const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(8000) })
    const html = (await r.text()).slice(0, 900_000)
    const ld = findProduct(html)
    const offer = [ld.offers].flat()[0] ?? {}
    const ldImg = [ld.image].flat()[0]
    const rawImg =
      meta(html, 'og:image:secure_url') ??
      meta(html, 'og:image') ??
      meta(html, 'twitter:image') ??
      meta(html, 'twitter:image:src') ??
      (typeof ldImg === 'string' ? ldImg : ldImg?.url) ??
      fallbackImage(html)

    const rawTitle = meta(html, 'og:title') ?? ld.name ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? ''
    const rawPrice =
      meta(html, 'product:price:amount') ??
      meta(html, 'og:price:amount') ??
      offer.price ??
      offer.lowPrice ??
      fallbackPrice(html)

    return Response.json(
      {
        title: rawTitle ? cleanTitle(rawTitle) : '',
        image: rawImg ? new URL(rawImg, url).href : '',
        price: Number(String(rawPrice ?? '').replace(/[^0-9.]/g, '')) || null,
        siteName: meta(html, 'og:site_name') ?? '',
      },
      { headers: JSON_HEADERS },
    )
  } catch {
    return image
      ? new Response(null, { status: 502 })
      : Response.json({}, { headers: JSON_HEADERS })
  }
}
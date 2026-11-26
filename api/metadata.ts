// Vercel Function. GET /api/metadata?url=<page>  -> { title, image, price, siteName }
//                  GET /api/metadata?image=<url> -> proxies the image bytes (avoids CORS)
const UA = {
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  accept: 'text/html,application/xhtml+xml,image/*,*/*;q=0.8',
}
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' }

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'")

function meta(html: string, key: string): string | undefined {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i')
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i')
  const m = html.match(a) ?? html.match(b)
  return m?.[1] ? decode(m[1]) : undefined
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
    const html = (await r.text()).slice(0, 800_000)
    const ld = findProduct(html)
    const offer = [ld.offers].flat()[0] ?? {}
    const ldImg = [ld.image].flat()[0]
    const rawImg = meta(html, 'og:image') ?? (typeof ldImg === 'string' ? ldImg : ldImg?.url)
    return Response.json(
      {
        title: meta(html, 'og:title') ?? ld.name ?? '',
        image: rawImg ? new URL(rawImg, url).href : '',
        price: Number(meta(html, 'product:price:amount') ?? offer.price ?? offer.lowPrice) || null,
        siteName: meta(html, 'og:site_name') ?? '',
      },
      { headers: JSON_HEADERS },
    )
  } catch {
    // Never surface scraper failures: the client falls back to manual entry.
    return image
      ? new Response(null, { status: 502 })
      : Response.json({}, { headers: JSON_HEADERS })
  }
}

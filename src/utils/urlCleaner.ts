const JUNK = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'igshid', 'yclid', 'mc_cid', 'mc_eid', 'ref', 'ref_',
  'faceout', 'seq', 'cmp', 'cid', 'ranmid', 'raneaid', 'ransiteid', 'irclickid', 'irgwc',
  'clickid', 'affid', '_ga', 'srsltid', 'cm_mmc', 'cm_sp', 'ito', 'icid', 'sid',
  'pagefm', 'prodvm', 'gridproductposition', 'categoryid', 'catalogid',
])

export function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw.trim())
    for (const k of [...u.searchParams.keys()]) {
      if (k.toLowerCase().startsWith('utm_') || JUNK.has(k.toLowerCase())) u.searchParams.delete(k)
    }
    u.hash = ''
    return u.toString()
  } catch {
    return raw.trim()
  }
}

export function storeName(raw: string): string {
  try {
    const host = new URL(raw).hostname.replace(/^(www|shop|m|us)\./, '')
    let n = host.split('.').slice(-2)[0] ?? ''
    const short = n.replace(/(co|shop|store)$/, '')
    if (short.length >= 4) n = short
    return n.charAt(0).toUpperCase() + n.slice(1)
  } catch {
    return ''
  }
}

export function slugTitle(raw: string): string {
  try {
    const segs = new URL(raw).pathname.split('/').filter(Boolean)
    const slug = segs.reverse().find((s) => s.includes('-') && !/^\d+$/.test(s))
    if (!slug) return ''
    return slug
      .replace(/-\d{5,}$/, '')
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  } catch {
    return ''
  }
}

export const parseTags = (s: string): string[] => [
  ...new Set(s.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)),
]
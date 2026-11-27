export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export function fmtDate(t: number): string {
  const d = new Date(t)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
    .toLowerCase()
}

export const fmtDateTime = (t: number) =>
  `${fmtDate(t)} · ${new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase()}`

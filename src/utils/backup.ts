import { db } from '../db'

const toB64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
const toBlob = async (s: string | null) => (s ? await (await fetch(s)).blob() : undefined)

export async function exportBackup() {
  const shop = await Promise.all(
    (await db.shop.toArray()).map(async ({ id: _id, image, ...rest }) => ({
      ...rest,
      image: image ? await toB64(image) : null,
    })),
  )
  const inspo = await Promise.all(
    (await db.inspo.toArray()).map(async ({ id: _id, image, ...rest }) => ({
      ...rest,
      image: await toB64(image),
    })),
  )
  const blob = new Blob([JSON.stringify({ app: 'grail', version: 1, shop, inspo })], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `grail-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function importBackup(file: File) {
  const data = JSON.parse(await file.text())
  if (data.app !== 'grail') throw new Error('not a grail backup file')
  const shop = await Promise.all(
    (data.shop ?? []).map(async (s: any) => ({ ...s, image: await toBlob(s.image) })),
  )
  const inspo = await Promise.all(
    (data.inspo ?? []).map(async (s: any) => ({ ...s, image: await toBlob(s.image) })),
  )
  await db.transaction('rw', db.shop, db.inspo, async () => {
    await db.shop.bulkAdd(shop)
    await db.inspo.bulkAdd(inspo.filter((i: any) => i.image))
  })
}

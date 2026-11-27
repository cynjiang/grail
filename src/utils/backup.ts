import { db } from '../db'

const toB64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
const toBlob = async (s: string) => await (await fetch(s)).blob()

export async function exportBackup() {
  const wishlist = await Promise.all(
    (await db.wishlist.toArray()).map(async ({ id: _id, images, ...rest }) => ({
      ...rest,
      images: await Promise.all(images.map(toB64)),
    })),
  )
  const inspo = await Promise.all(
    (await db.inspo.toArray()).map(async ({ id: _id, image, ...rest }) => ({
      ...rest,
      image: await toB64(image),
    })),
  )
  const blob = new Blob([JSON.stringify({ app: 'starinspo', version: 1, wishlist, inspo })], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `starinspo-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function importBackup(file: File) {
  const data = JSON.parse(await file.text())
  if (data.app !== 'starinspo') throw new Error('not a starinspo backup file')
  const wishlist = await Promise.all(
    (data.wishlist ?? []).map(async (s: any) => ({
      ...s,
      images: await Promise.all((s.images ?? []).map(toBlob)),
    })),
  )
  const inspo = await Promise.all(
    (data.inspo ?? []).map(async (s: any) => ({ ...s, image: s.image ? await toBlob(s.image) : undefined })),
  )
  await db.transaction('rw', db.wishlist, db.inspo, async () => {
    await db.wishlist.bulkAdd(wishlist)
    await db.inspo.bulkAdd(inspo.filter((i: any) => i.image))
  })
}
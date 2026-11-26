import Dexie, { type Table } from 'dexie'

export interface ShopItem {
  id?: number
  image?: Blob
  title: string
  price?: number
  store: string
  url?: string
  notes?: string
  status: 'want' | 'bought'
  createdAt: number
}

export interface InspoItem {
  id?: number
  image: Blob
  tags: string[]
  sourceUrl?: string
  createdAt: number
}

class GrailDB extends Dexie {
  shop!: Table<ShopItem, number>
  inspo!: Table<InspoItem, number>
  constructor() {
    super('grail')
    this.version(1).stores({
      shop: '++id, status, createdAt',
      inspo: '++id, *tags, createdAt',
    })
  }
}

export const db = new GrailDB()

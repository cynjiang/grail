import Dexie, { type Table } from 'dexie'

export interface WishlistItem {
  id?: number
  image?: Blob
  title?: string
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

class starinspoDB extends Dexie {
  wishlist!: Table<WishlistItem, number>
  inspo!: Table<InspoItem, number>
  constructor() {
    super('starinspo')
    this.version(1).stores({
      wishlist: '++id, status, createdAt',
      inspo: '++id, *tags, createdAt',
    })
  }
}

export const db = new starinspoDB()
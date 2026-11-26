# grail

a tiny shopping list + inspo board that lives on your phone.

- **shopping:** save stuff you want to buy; mark when acquired.
- **inspo:** a visual board of outfit and thrift refs; filter by tag.
- **paste a link:** grail tries to fill in the title, price and photo for you.
- **works offline:** everything is saved on your device.

## deploy

1. press: 

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cynjiang/grail)

2. sign in to vercel (free plan is enough) and click **deploy**.
3. open the link vercel gives you on your phone.
4. installation:
   - **iphone (safari):** share, then **add to home screen**
   - **android (chrome/edge):** menu, then **install app** or **add to home screen**

## usage

tap the **+** button, then either:

- paste a product link and let grail fill in what it can, or
- upload a photo, or paste one from your clipboard (ctrl/cmd+v on a computer)

some big stores block auto lookups. if grail can't read a link nothing breaks, just manually type the title or add a photo. the link still saves so the **buy** button works.

## data

your stuff is saved in your browser on that one device. it doesn't sync between devices, and clearing your browser data wipes it.

to back it up or move it, tap the gear icon, then **export backup**. you get a `.json` file with your items and photos. **import backup** puts it back on any device.

## run locally

you need [node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npx vercel dev
```

`vercel dev` runs the app and the link lookup together. with plain `npm run dev` everything works except auto link lookup.

## layout

```
api/
  metadata.ts          link lookup: grabs title, price + image from a pasted url
src/
  App.tsx              tabs, + button, backup menu
  db.ts                indexeddb tables + types (dexie)
  components/
    Shopping.tsx       shopping grid, running total, bought section
    Inspo.tsx          masonry board, tag filter, lightbox
    QuickAdd.tsx       add modal: paste a link, upload or paste an image
  utils/
    urlCleaner.ts      strips tracking junk from links, guesses the store name
    backup.ts          export/import backup as json (photos saved as base64)
    useObjectUrl.ts    turns stored image blobs into something <img> can show
public/
  icon-192.png         app icons for add to home screen
  icon-512.png
vite.config.ts         vite + tailwind + offline (pwa) setup
```

## built with

react, typescript, vite, tailwind, dexie (indexeddb) and vite-plugin-pwa.  

link lookup is one serverless function in `api/metadata.ts`.
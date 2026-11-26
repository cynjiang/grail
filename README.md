# ✦ starinspo

a lightweight wishlist + inspo board.

[![StarInspo](https://img.shields.io/badge/✦_StarInspo-starinspo.vercel.app-70B8FF?style=for-the-badge&labelColor=011936)](https://starinspo.vercel.app/)

- **wishlist:** save stuff you want to buy in grid or list view; mark when acquired.
- **inspo:** a visual board of outfit and thrift refs; filter by tag.
- **paste a link or photo:** starinspo tries to fill in the title, price and photo for you (or paste an image straight onto inspo).
- **works offline:** everything is saved on your device.

## usage

tap the star button, then either:

- paste a product link and let starinspo fill in what it can, or
- upload a photo, or paste one from your clipboard (ctrl/cmd+v on a computer)

some big stores block auto lookups. if starinspo can't read a link nothing breaks, just manually type the details or add a photo. the link still saves so the **buy** button works.

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

## self-host / deploy

1. press:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cynjiang/starinspo)

2. sign in to vercel (free plan is enough) and click **deploy**.
3. open the link vercel gives you on your phone.
4. installation:
   - **iphone (safari):** share, then **add to home screen**
   - **android (chrome/edge):** menu, then **install app** or **add to home screen**

## layout

```
api/
  metadata.ts          link lookup: grabs title, price + image from a pasted url
public/
  favicon.svg          browser tab icon
  icon-192.png         pwa app icon (192x192)
  icon-512.png         pwa app icon (512x512)
  icons.svg            default svg icon sprite
src/
  assets/
    hero.png           static image asset
    react.svg          react logo asset
    vite.svg           vite logo asset
  components/
    Inspo.tsx          masonry board, tag filter, lightbox
    QuickAdd.tsx       add/edit modal: paste a link, upload or paste an image
    Wishlist.tsx       wishlist grid/list view, running total, purchased section
  utils/
    backup.ts          export/import backup as json (photos saved as base64)
    urlCleaner.ts      strips tracking junk from links, guesses the brand name
    useObjectUrl.ts    turns stored image blobs into something <img> can show
  App.tsx              tabs, star add button, scrollbar, backup menu
  db.ts                indexeddb tables + types (dexie)
  index.css            tailwind v4 setup + custom animations
  main.tsx             react entry point
.gitignore             git ignored files
eslint.config.js       eslint configuration
index.html             html entry point + fonts
package.json           dependencies + scripts
README.md              project documentation
tsconfig.app.json      typescript config for app source
tsconfig.json          root typescript config
tsconfig.node.json     typescript config for vite/node
vite.config.ts         vite + tailwind + offline (pwa) setup
```

## built with

react, typescript, vite, tailwind, dexie (indexedDB) and vite-plugin-pwa.

link lookup is one serverless function in `api/metadata.ts`.

## roadmap

- drag and drop image uploads
- smarter link/image fallbacks for sites like pinterest and storefronts that block basic scrapers
- filtering & sorting on wishlist (by brand, price, status, etc)
- tag search / multi-tag filtering on inspo

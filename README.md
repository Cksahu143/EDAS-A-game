# EDAS — A hand-painted story

Imported from Lovable (workspace: BGNS's Lovable, project: Verdant Bloom / EDAS).

## Setup

```bash
bun install   # or npm install
bun dev       # or npm run dev
```

## Missing assets (need to be pulled manually from Lovable)

- `src/assets/prologue-1.png` through `prologue-5.png` — referenced by `src/game/EdasGame.tsx`.
  Binary files can't be extracted through the text-based file reader used to import this
  project; grab them from the Lovable project's file browser and drop them in `src/assets/`.
- `public/favicon.ico`

## Regeneratable files (not copied — stock shadcn/ui boilerplate)

`src/components/ui/*.tsx` (~45 files) are unmodified shadcn/ui components. After
`bun install`, regenerate any you need with:

```bash
npx shadcn@latest add <component-name>
```

Full component list used by this project is in `components.json` / `package.json` deps.

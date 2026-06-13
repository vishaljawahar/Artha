/**
 * Generate PWA / home-screen icons from the app logo.
 *
 * Source: src/app/icon.png (the designed Artha tile — a cream rounded square
 * with transparent corners). For home-screen icons iOS wants a full, opaque
 * square (transparent corners can render as black), so we flatten the
 * transparent areas onto the tile's cream color (#fce3c8) and `contain`-fit to
 * a square — no content is cropped, the few px of difference is padded in cream.
 *
 * Outputs (committed to the repo, served statically from /icons):
 *   public/icons/icon-192.png        192x192  — manifest, purpose "any"
 *   public/icons/icon-512.png        512x512  — manifest, purpose "any"
 *   public/icons/apple-touch-icon.png 180x180 — iOS apple-touch-icon
 *
 * Run with: node scripts/generate-pwa-icons.mjs
 * `sharp` is already available via Next 16's image pipeline — no extra dependency.
 * Re-run this whenever src/app/icon.png changes.
 */
import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE = join(root, "src/app/icon.png")
const OUT_DIR = join(root, "public/icons")

// Sampled from the icon's cream tile (warm peach/cream gradient ~#fce3c8).
const CREAM = { r: 0xfc, g: 0xe3, b: 0xc8, alpha: 1 }

const TARGETS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // Flatten transparent corners onto cream once → opaque base, then resize per target.
  const base = await sharp(SOURCE).flatten({ background: CREAM }).png().toBuffer()

  for (const { file, size } of TARGETS) {
    await sharp(base)
      .resize(size, size, { fit: "contain", background: CREAM })
      .png()
      .toFile(join(OUT_DIR, file))
    console.log(`✓ ${file} (${size}x${size})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

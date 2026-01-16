const fs = require('fs')
const path = require('path')

const SRC_PUBLIC = path.join(__dirname, 'public')
const SRC_STATIC = path.join(__dirname, '.next', 'static')
const DEST_STANDALONE = path.join(__dirname, '.next', 'standalone')
const DEST_PUBLIC = path.join(DEST_STANDALONE, 'public')
const DEST_STATIC = path.join(DEST_STANDALONE, '.next', 'static')

const pathExists = async (target) => {
  try {
    await fs.promises.access(target)
    return true
  } catch (err) {
    return false
  }
}

const ensureDir = async (target) => {
  await fs.promises.mkdir(target, { recursive: true })
}

const removeDir = async (target) => {
  if (!(await pathExists(target))) return
  await fs.promises.rm(target, { recursive: true, force: true })
}

const copyDir = async (src, dest) => {
  if (!(await pathExists(src))) {
    throw new Error(`Source not found: ${src}`)
  }

  await removeDir(dest)
  await ensureDir(dest)

  const entries = await fs.promises.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
      continue
    }

    if (entry.isSymbolicLink()) {
      const link = await fs.promises.readlink(srcPath)
      await fs.promises.symlink(link, destPath)
      continue
    }

    if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

const run = async () => {
  console.log('[deploy-pack] Copying public...')
  await copyDir(SRC_PUBLIC, DEST_PUBLIC)

  console.log('[deploy-pack] Copying .next/static...')
  await copyDir(SRC_STATIC, DEST_STATIC)

  console.log('[deploy-pack] Done.')
}

run().catch((err) => {
  console.error('[deploy-pack] Failed:', err)
  process.exit(1)
})

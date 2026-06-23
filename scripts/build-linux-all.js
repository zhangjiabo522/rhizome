#!/usr/bin/env node
const { spawnSync } = require('child_process')
const os = require('os')

const HOST_TO_DEB = {
  x64: 'amd64',
  arm64: 'arm64',
  arm: 'armv7l',
  ia32: 'i386'
}

const ALL_ARCHS = ['amd64', 'arm64', 'armv7l']

function build(arch) {
  console.log(`\n=== Building deb for ${arch} ===`)
  const archFlag = `--${arch === 'amd64' ? 'x64' : arch}`
  const r = spawnSync('npx', ['electron-builder', '--linux', 'deb', archFlag], {
    env: { ...process.env, RHIZOME_ARCH: arch },
    stdio: 'inherit',
    shell: false
  })
  return r.status === 0
}

const hostArch = HOST_TO_DEB[os.arch()] || os.arch()
const requested = (process.env.RHIZOME_ARCHS || '').split(',').filter(Boolean)

let targets = requested.length ? requested : [hostArch]

if (process.argv.includes('--all')) targets = ALL_ARCHS

console.log(`Host arch: ${hostArch}`)
console.log(`Target archs: ${targets.join(', ')}`)

let ok = true
for (const arch of targets) {
  if (!build(arch)) {
    ok = false
    console.error(`Build failed for ${arch}`)
  }
}

process.exit(ok ? 0 : 1)

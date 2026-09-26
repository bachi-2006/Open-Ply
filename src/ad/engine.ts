import { AdPlacement } from '../types'

const ADS: AdPlacement[] = [
  { line: 'Sponsored: Deploy your app instantly at HostPly.com — free tier included.' },
  { line: 'Sponsored: Get 50% off your first month at CodeMetrics.dev' },
  { line: 'Sponsored: Monitor your API at ApiWatch.io — free for 30 days.' },
  { line: 'Sponsored: Ship faster with DeployKit — CI/CD for indie devs.' },
  { line: 'Sponsored: Secure your app with AuthShield — 1M requests free/mo.' },
  { line: 'Sponsored: Database backups with DBVault — start free.' },
  { line: 'Sponsored: Learn system design at SystemDesign.io — use code OPENPLY20' },
  { line: 'openPly is free because of ads like this. Upgrade to Pro to remove them.' },
]

let index = 0

export function getAd(): AdPlacement | null {
  if (process.env.OPENPLY_NO_ADS) return null
  const ad = ADS[index % ADS.length]
  index++
  return ad
}

export function resetAdCounter() {
  index = 0
}

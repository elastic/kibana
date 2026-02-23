/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';

export const assertTailscaleAvailable = async (log: ToolingLog): Promise<void> => {
  try {
    const { stdout } = await execa('tailscale', ['version']);
    log.verbose(`tailscale detected: ${stdout.trim()}`);
  } catch (e) {
    throw new Error(`tailscale CLI is required on the operator machine. Install Tailscale.\n${e}`);
  }
};

export const getLocalTailscaleIpv4 = async (): Promise<string> => {
  const { stdout } = await execa('tailscale', ['ip', '-4']);
  const ip = stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)[0];
  if (!ip) {
    throw new Error(`Unable to determine local Tailscale IPv4. Is Tailscale connected?`);
  }
  return ip;
};

export const getLocalTailscaleMagicDnsName = async (): Promise<string | undefined> => {
  // Prefer MagicDNS name (Self.DNSName) when available.
  // This requires MagicDNS enabled in the tailnet and accept-dns=true on the client.
  try {
    const { stdout } = await execa('tailscale', ['status', '--json']);
    const parsed = JSON.parse(stdout) as any;
    const dnsName = (parsed?.Self?.DNSName as string | undefined) || '';
    const cleaned = dnsName.trim().replace(/\.$/, '');
    return cleaned || undefined;
  } catch {
    return undefined;
  }
};

export const getPreferredLocalTailscaleHost = async (
  log: ToolingLog
): Promise<{ hostname?: string; ip: string }> => {
  await assertTailscaleAvailable(log);
  const [hostname, ip] = await Promise.all([getLocalTailscaleMagicDnsName(), getLocalTailscaleIpv4()]);
  return { hostname, ip };
};



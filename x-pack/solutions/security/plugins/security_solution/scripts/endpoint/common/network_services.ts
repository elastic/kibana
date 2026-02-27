/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkInterfaces } from 'node:os';

export const getAllExternalIpv4Addresses = (): string[] => {
  const interfaces = networkInterfaces();
  const ips: string[] = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && entry.internal === false && entry.address) {
        ips.push(entry.address);
      }
    }
  }

  return [...new Set(ips)];
};

export const getLocalhostRealIp = (): string => {
  const override =
    process.env.KBN_LOCALHOST_REAL_IP ??
    process.env.LOCALHOST_REAL_IP ??
    process.env.KIBANA_LOCALHOST_REAL_IP ??
    '';

  if (override) {
    // very small sanity check (IPv4)
    const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(override);
    if (!isIpv4) {
      throw new Error(
        `Invalid IP provided via KBN_LOCALHOST_REAL_IP/LOCALHOST_REAL_IP/KIBANA_LOCALHOST_REAL_IP: [${override}]`
      );
    }
    return override;
  }

  const interfaces = networkInterfaces();
  const candidates: Array<{ name: string; address: string; priority: number }> = [];

  const isLinkLocal = (address: string) => address.startsWith('169.254.');
  // Skip common virtual/tunnel interfaces that are usually not reachable from VMs/containers.
  // NOTE: we intentionally DO NOT skip `bridge*` and `vmnet*` because they are often the
  // correct choice for VM connectivity on macOS (e.g. UTM shared networking uses `bridge100`).
  const skipNamePrefixes = ['docker', 'utun', 'awdl', 'llw', 'vboxnet', 'tun', 'tap'];
  const preferredNames = new Set(['en0', 'en1', 'en2', 'eth0', 'eth1', 'wlan0', 'wlan1']);

  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    if (!skipNamePrefixes.some((p) => interfaceName.startsWith(p))) {
      for (const entry of entries ?? []) {
        if (
          entry.family === 'IPv4' &&
          entry.internal === false &&
          entry.address &&
          !isLinkLocal(entry.address)
        ) {
          let priority = 1;
          if (interfaceName.startsWith('bridge')) priority = 3;
          else if (preferredNames.has(interfaceName)) priority = 2;

          candidates.push({ name: interfaceName, address: entry.address, priority });
        }
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length > 0) {
    return candidates[0].address;
  }

  return '0.0.0.0';
};

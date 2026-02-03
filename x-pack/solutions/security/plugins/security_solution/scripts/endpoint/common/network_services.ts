/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkInterfaces } from 'node:os';

/**
 * Checks if an IP address is a link-local address (169.254.x.x)
 * These are self-assigned addresses when DHCP fails and should be avoided
 */
const isLinkLocalAddress = (address: string): boolean => {
  return address.startsWith('169.254.');
};

/**
 * Gets the real localhost IP address suitable for VM connectivity.
 *
 * Priority order:
 * 1. Bridge interfaces (bridge100, etc.) - preferred for VM connectivity (192.168.2.x)
 * 2. Other non-internal IPv4 addresses (excluding link-local 169.254.x.x)
 * 3. Falls back to 0.0.0.0 if nothing suitable found
 */
export const getLocalhostRealIp = (): string => {
  const interfaces = networkInterfaces();
  const candidates: Array<{ name: string; address: string; priority: number }> = [];

  for (const [interfaceName, netInterfaceList] of Object.entries(interfaces)) {
    if (netInterfaceList) {
      for (const netInterface of netInterfaceList) {
        if (
          netInterface.family === 'IPv4' &&
          netInterface.internal === false &&
          netInterface.address &&
          !isLinkLocalAddress(netInterface.address)
        ) {
          // Assign priority: bridge interfaces get highest priority for VM connectivity
          let priority = 1;
          if (interfaceName.startsWith('bridge')) {
            priority = 3; // Highest priority - bridge interfaces for VMs
          } else if (interfaceName === 'en0') {
            priority = 2; // Second priority - primary Wi-Fi/Ethernet
          }

          candidates.push({
            name: interfaceName,
            address: netInterface.address,
            priority,
          });
        }
      }
    }
  }

  // Sort by priority (descending) and return the best candidate
  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length > 0) {
    return candidates[0].address;
  }

  return '0.0.0.0';
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NetworkInterfaceInfo } from 'node:os';
import { networkInterfaces } from 'node:os';

const ipv4ToInt = (address: string): number =>
  address.split('.').reduce((total, octet) => total * 256 + Number(octet), 0);

const isSubnetNetworkIdentifier = ({ address, netmask }: NetworkInterfaceInfo): boolean => {
  const subnetSize = 2 ** 32 - ipv4ToInt(netmask);

  // A `/31` or `/32` interface has no network identifier (RFC 3021), so its address is a host address.
  if (subnetSize <= 2) {
    return false;
  }

  return ipv4ToInt(address) % subnetSize === 0;
};

export const getLocalhostRealIp = (): string => {
  if (process.env.KIBANA_LOCALHOST_REAL_IP) {
    return process.env.KIBANA_LOCALHOST_REAL_IP;
  }
  // reverse to get the last interface first
  for (const netInterfaceList of Object.values(networkInterfaces()).reverse()) {
    if (netInterfaceList) {
      const netInterface = netInterfaceList.find(
        (networkInterface) =>
          networkInterface.family === 'IPv4' &&
          networkInterface.internal === false &&
          networkInterface.address &&
          // Skip Docker / OrbStack / VPN bridges bound to their own subnet's network identifier.
          !isSubnetNetworkIdentifier(networkInterface)
      );
      if (netInterface) {
        return netInterface.address;
      }
    }
  }
  throw new Error(
    `Unable to determine this machine's external IPv4 address, which test VMs and containers must use to reach the local stack. Set KIBANA_LOCALHOST_REAL_IP to that address.`
  );
};

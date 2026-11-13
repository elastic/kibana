/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkInterfaces } from 'node:os';

const IPV4_SPACE = 2 ** 32;

const ipv4ToInt = (address: string): number =>
  address.split('.').reduce((value, octet) => value * 256 + Number(octet), 0);

// An address identifies its subnet when all of its host bits are zero, which depends on the
// netmask: `10.224.1.0/20` is an ordinary host address while `10.224.1.0/24` is not. Netmasks
// are contiguous, so the identifier is always a multiple of the subnet's block size. A `/32` or
// `/31` block reserves no identifier, so its address is always the interface's own host address.
const isNetworkIdentifier = ({
  address,
  netmask,
}: {
  address: string;
  netmask: string;
}): boolean => {
  const blockSize = IPV4_SPACE - ipv4ToInt(netmask);

  return blockSize > 2 && ipv4ToInt(address) % blockSize === 0;
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
          // Skip Docker / OrbStack / VPN bridge network addresses — those are
          // network identifiers, not host IPs.
          !isNetworkIdentifier(networkInterface)
      );
      if (netInterface) {
        return netInterface.address;
      }
    }
  }
  throw new Error(
    'Unable to determine this host real IP address: no external IPv4 network interface was found. ' +
      'Set the KIBANA_LOCALHOST_REAL_IP environment variable to the address agents should use to reach this host.'
  );
};

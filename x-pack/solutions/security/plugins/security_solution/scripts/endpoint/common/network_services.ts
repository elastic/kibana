/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkInterfaces } from 'node:os';

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
          // Skip Docker / OrbStack / VPN bridge network addresses where the
          // last octet is `.0` — those are network identifiers, not host IPs.
          !networkInterface.address.endsWith('.0')
      );
      if (netInterface) {
        return netInterface.address;
      }
    }
  }
  return '0.0.0.0';
};

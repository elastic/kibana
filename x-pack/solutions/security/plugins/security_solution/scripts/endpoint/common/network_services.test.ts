/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NetworkInterfaceInfo } from 'node:os';
import { networkInterfaces } from 'node:os';
import { getLocalhostRealIp } from './network_services';

jest.mock('node:os', () => ({
  ...jest.requireActual('node:os'),
  networkInterfaces: jest.fn(),
}));

const networkInterfacesMock = networkInterfaces as jest.MockedFunction<typeof networkInterfaces>;

const externalIpv4 = (address: string, netmask: string): NetworkInterfaceInfo => ({
  address,
  netmask,
  family: 'IPv4',
  mac: '00:00:00:00:00:00',
  internal: false,
  cidr: null,
});

const loopback: NetworkInterfaceInfo = {
  address: '127.0.0.1',
  netmask: '255.0.0.0',
  family: 'IPv4',
  mac: '00:00:00:00:00:00',
  internal: true,
  cidr: '127.0.0.1/8',
};

describe('getLocalhostRealIp', () => {
  beforeEach(() => {
    delete process.env.KIBANA_LOCALHOST_REAL_IP;
  });

  it('returns KIBANA_LOCALHOST_REAL_IP when it is set', () => {
    process.env.KIBANA_LOCALHOST_REAL_IP = '192.0.2.10';
    networkInterfacesMock.mockReturnValue({});

    expect(getLocalhostRealIp()).toBe('192.0.2.10');
  });

  it('returns a host address whose last octet is `.0` in a subnet wider than /24', () => {
    networkInterfacesMock.mockReturnValue({
      lo: [loopback],
      ens4: [externalIpv4('10.224.7.0', '255.255.240.0')],
    });

    expect(getLocalhostRealIp()).toBe('10.224.7.0');
  });

  it('returns a `/32` address whose last octet is `.0`', () => {
    networkInterfacesMock.mockReturnValue({
      ens4: [externalIpv4('10.224.7.0', '255.255.255.255')],
    });

    expect(getLocalhostRealIp()).toBe('10.224.7.0');
  });

  it('skips a bridge bound to its own subnet network identifier', () => {
    networkInterfacesMock.mockReturnValue({
      en0: [externalIpv4('192.168.1.42', '255.255.255.0')],
      bridge100: [externalIpv4('192.168.65.0', '255.255.255.0')],
    });

    expect(getLocalhostRealIp()).toBe('192.168.1.42');
  });

  it('throws naming the override when no external IPv4 interface is available', () => {
    networkInterfacesMock.mockReturnValue({ lo: [loopback] });

    expect(() => getLocalhostRealIp()).toThrow('KIBANA_LOCALHOST_REAL_IP');
  });
});

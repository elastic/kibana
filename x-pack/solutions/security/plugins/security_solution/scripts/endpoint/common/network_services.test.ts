/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkInterfaces } from 'node:os';
import { getLocalhostRealIp } from './network_services';

jest.mock('node:os', () => ({ networkInterfaces: jest.fn() }));

const networkInterfacesMock = networkInterfaces as jest.MockedFunction<typeof networkInterfaces>;

const ipv4 = (address: string, netmask: string, internal = false) => ({
  address,
  netmask,
  family: 'IPv4' as const,
  mac: '00:00:00:00:00:00',
  internal,
  cidr: null,
});

describe('getLocalhostRealIp', () => {
  beforeEach(() => {
    delete process.env.KIBANA_LOCALHOST_REAL_IP;
  });

  it('returns a host address whose last octet is `.0` when the subnet is wider than /24', () => {
    networkInterfacesMock.mockReturnValue({
      ens4: [ipv4('10.224.1.0', '255.255.240.0')],
    });

    expect(getLocalhostRealIp()).toBe('10.224.1.0');
  });

  it('returns a `.0` host address advertised with a single-address `/32` netmask', () => {
    networkInterfacesMock.mockReturnValue({
      ens4: [ipv4('10.224.1.0', '255.255.255.255')],
    });

    expect(getLocalhostRealIp()).toBe('10.224.1.0');
  });

  it('returns a host address from a two-address `/31` point-to-point link', () => {
    networkInterfacesMock.mockReturnValue({
      eth0: [ipv4('10.0.0.4', '255.255.255.254')],
    });

    expect(getLocalhostRealIp()).toBe('10.0.0.4');
  });

  it('skips addresses that are the network identifier of their subnet', () => {
    networkInterfacesMock.mockReturnValue({
      br0: [ipv4('192.168.1.0', '255.255.255.0')],
      eth0: [ipv4('192.168.1.42', '255.255.255.0')],
    });

    expect(getLocalhostRealIp()).toBe('192.168.1.42');
  });

  it('skips loopback interfaces', () => {
    networkInterfacesMock.mockReturnValue({
      lo: [ipv4('127.0.0.1', '255.0.0.0', true)],
      eth0: [ipv4('10.0.0.5', '255.255.255.0')],
    });

    expect(getLocalhostRealIp()).toBe('10.0.0.5');
  });

  it('prefers KIBANA_LOCALHOST_REAL_IP over interface detection', () => {
    process.env.KIBANA_LOCALHOST_REAL_IP = '203.0.113.7';
    networkInterfacesMock.mockReturnValue({ eth0: [ipv4('10.0.0.5', '255.255.255.0')] });

    expect(getLocalhostRealIp()).toBe('203.0.113.7');
  });

  it('throws instead of returning an unusable `0.0.0.0` when no candidate is found', () => {
    networkInterfacesMock.mockReturnValue({
      lo: [ipv4('127.0.0.1', '255.0.0.0', true)],
    });

    expect(() => getLocalhostRealIp()).toThrow('KIBANA_LOCALHOST_REAL_IP');
  });
});

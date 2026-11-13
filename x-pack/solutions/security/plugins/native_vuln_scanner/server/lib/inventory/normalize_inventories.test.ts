/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeInventories, type AgentInventoryRows } from './normalize';

const agent = (
  overrides: Partial<AgentInventoryRows> & { agentId: string }
): AgentInventoryRows => ({
  os: { platform: 'ubuntu', codename: 'noble', major: '24.04', name: 'Ubuntu 24.04 LTS' },
  deb: [{ name: 'apt', version: '2.7.14build2', source: 'apt', status: 'install ok installed' }],
  kernel: { version: '6.8.0-51-generic' },
  ...overrides,
});

describe('normalizeInventories', () => {
  it('builds matcher input and host metadata from one snapshot', () => {
    const [host] = normalizeInventories([agent({ agentId: 'a1', hostName: 'web-1' })]).hosts;
    expect(host.inventory).toEqual({
      id: 'a1',
      os: { family: 'ubuntu', version: 'noble' },
      kernelRelease: '6.8.0-51-generic',
      packages: [{ name: 'apt', version: '2.7.14build2', arch: undefined, source: 'apt' }],
    });
    expect(host.meta).toEqual({
      id: 'a1',
      name: 'web-1',
      os: {
        family: 'ubuntu',
        version: 'noble',
        name: 'Ubuntu 24.04 LTS',
        kernel: '6.8.0-51-generic',
      },
    });
  });

  it('reads rpm rows on a rhel host and leaves module streams unknown', () => {
    const [host] = normalizeInventories([
      agent({
        agentId: 'a2',
        os: {
          platform: 'rhel',
          major: '9',
          platform_like: 'rhel',
          name: 'Red Hat Enterprise Linux 9',
        },
        deb: undefined,
        rpm: [
          {
            name: 'openssl-libs',
            epoch: 1,
            version: '3.2.2',
            release: '6.el9',
            arch: 'x86_64',
            source: 'openssl-3.2.2-6.el9.src.rpm',
          },
          { name: 'gpg-pubkey', version: '1', release: '2' },
        ],
      }),
    ]).hosts;
    expect(host.inventory.enabledModules).toBeUndefined();
    expect(host.inventory.os).toEqual({ family: 'rhel', version: '9' });
    expect(host.inventory.packages).toEqual([
      {
        name: 'openssl-libs',
        version: '1:3.2.2-6.el9',
        arch: 'x86_64',
        source: 'openssl-3.2.2-6.el9.src.rpm',
      },
    ]);
    expect(host.meta.os.name).toBe('Red Hat Enterprise Linux 9');
  });

  it('skips hosts that cannot be scanned safely, instead of scanning them as empty', () => {
    const result = normalizeInventories([
      agent({ agentId: 'no-os', os: undefined }),
      agent({ agentId: 'no-release', os: { platform: 'ubuntu' } }),
      agent({ agentId: 'sles', os: { platform: 'sles', major: '15' } }),
      agent({
        agentId: 'no-packages',
        deb: [{ name: 'old', version: '1', status: 'deinstall ok config-files' }],
      }),
    ]);
    expect(result.hosts).toEqual([]);
    expect(result.skippedHosts).toEqual({
      missing_os_version: 1,
      missing_os_release: 1,
      unsupported_os: 1,
      missing_packages: 1,
    });
  });

  it('counts dropped package rows per reason', () => {
    const result = normalizeInventories([
      agent({
        agentId: 'a3',
        deb: [
          { name: 'kept', version: '1', status: 'install ok installed' },
          { name: 'gone', version: '1', status: 'purge ok not-installed' },
          { name: 'broken' },
        ],
      }),
    ]);
    expect(result.hosts[0].inventory.packages).toHaveLength(1);
    expect(result.skippedRows).toEqual({ deb_not_installed: 1, deb_missing_field: 1 });
  });
});

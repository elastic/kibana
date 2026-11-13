/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvisoryRecord } from '../feeds/types';
import type { HostInventory, MatchStats } from './types';
import { buildAdvisoryIndex, matchHost, rhelKernelEvr, sourceRpmName } from './match';

const UBUNTU = { family: 'ubuntu', version: 'noble' } as const;
const RHEL9 = { family: 'rhel', version: '9' } as const;

const record = (
  overrides: Partial<AdvisoryRecord> & Pick<AdvisoryRecord, 'os'>
): AdvisoryRecord => {
  const scheme = overrides.os.family === 'ubuntu' ? 'dpkg' : 'rpm';
  return {
    advisory: {
      id: 'ADV-1',
      source: scheme === 'dpkg' ? 'ubuntu' : 'redhat',
      definition_id: 'oval:def:1',
      title: 'title',
    },
    kind: 'package',
    package: { name: 'pkg' },
    fixed_version: { raw: '1.0', scheme },
    cves: [{ id: 'CVE-2026-0001' }],
    conditions: [],
    feed: { snapshot_time: '2026-11-12T00:00:00Z' },
    ...overrides,
  };
};

const host = (overrides: Partial<HostInventory> & Pick<HostInventory, 'os'>): HostInventory => ({
  id: 'host-1',
  packages: [],
  ...overrides,
});

const run = (h: HostInventory, records: AdvisoryRecord[], stats?: MatchStats) =>
  matchHost(h, buildAdvisoryIndex(records), stats);

describe('matchHost: Ubuntu', () => {
  const opensslFix = record({
    os: UBUNTU,
    advisory: { id: 'CVE-2026-0001', source: 'ubuntu', definition_id: 'd1', title: 'openssl' },
    package: { name: 'openssl', binaries: ['libssl3t64', 'openssl'] },
    fixed_version: { raw: '3.0.13-0ubuntu3.5', scheme: 'dpkg' },
  });

  it('reports each installed binary of the source that is older than the fix', () => {
    const findings = run(
      host({
        os: UBUNTU,
        packages: [
          { name: 'libssl3t64', version: '3.0.13-0ubuntu3.4', source: 'openssl' },
          { name: 'openssl', version: '3.0.13-0ubuntu3.5', source: 'openssl' },
        ],
      }),
      [opensslFix]
    );
    expect(findings).toEqual([
      expect.objectContaining({
        hostId: 'host-1',
        cve: { id: 'CVE-2026-0001' },
        package: expect.objectContaining({ name: 'libssl3t64' }),
        fixedVersion: '3.0.13-0ubuntu3.5',
        scheme: 'dpkg',
        why: 'libssl3t64 3.0.13-0ubuntu3.4 is earlier than 3.0.13-0ubuntu3.5 (CVE-2026-0001, source openssl)',
        feedSnapshotTime: '2026-11-12T00:00:00Z',
      }),
    ]);
  });

  it('uses dpkg ordering, not string ordering (tilde sorts before release)', () => {
    const fix = record({
      os: UBUNTU,
      package: { name: 'curl', binaries: ['curl'] },
      fixed_version: { raw: '8.5.0-2ubuntu10.1', scheme: 'dpkg' },
    });
    const at = (version: string) =>
      run(host({ os: UBUNTU, packages: [{ name: 'curl', version }] }), [fix]).length;
    expect(at('8.5.0-2ubuntu10.1~esm1')).toBe(1);
    expect(at('8.5.0-2ubuntu9')).toBe(1);
    expect(at('8.5.0-2ubuntu10.1')).toBe(0);
    expect(at('1:7.0-1')).toBe(0);
  });

  it('ignores advisories for another release', () => {
    const jammy = { ...opensslFix, os: { family: 'ubuntu', version: 'jammy' } as const };
    const stats: MatchStats = {};
    const h = host({ os: UBUNTU, packages: [{ name: 'openssl', version: '1.0' }] });
    expect(run(h, [jammy], stats)).toEqual([]);
    expect(stats).toEqual({ no_advisories_for_os: 1 });
  });

  describe('running kernel', () => {
    const raspi = record({
      os: UBUNTU,
      advisory: { id: 'CVE-2021-47488', source: 'ubuntu', definition_id: 'k1', title: 'linux' },
      kind: 'running_kernel',
      package: {
        name: 'linux-raspi',
        release_version: { prefix: '0:', pattern: '^([\\d|\\.]+-\\d+)[-|\\w]+$' },
      },
      fixed_version: { raw: '0:6.8.0-1024', scheme: 'dpkg' },
      conditions: [[{ type: 'kernel_release_matches', pattern: '6\\.8\\.0\\-\\d+(\\-raspi)' }]],
    });

    it('compares the ABI version captured from uname -r when the flavour matches', () => {
      const findings = run(host({ os: UBUNTU, kernelRelease: '6.8.0-1020-raspi' }), [raspi]);
      expect(findings).toEqual([
        expect.objectContaining({
          kind: 'running_kernel',
          package: { name: 'linux-raspi', version: '0:6.8.0-1020' },
          fixedVersion: '0:6.8.0-1024',
          why: 'running kernel 6.8.0-1020-raspi (0:6.8.0-1020) is earlier than 0:6.8.0-1024 (CVE-2021-47488; running kernel 6.8.0-1020-raspi matches /6\\.8\\.0\\-\\d+(\\-raspi)/)',
        }),
      ]);
    });

    it('skips other flavours and patched kernels', () => {
      expect(run(host({ os: UBUNTU, kernelRelease: '6.8.0-1020-generic' }), [raspi])).toEqual([]);
      expect(run(host({ os: UBUNTU, kernelRelease: '6.8.0-1024-raspi' }), [raspi])).toEqual([]);
    });

    it('counts hosts without a kernel release instead of guessing', () => {
      const stats: MatchStats = {};
      expect(run(host({ os: UBUNTU }), [raspi], stats)).toEqual([]);
      expect(stats).toEqual({ unknown_kernel_release: 1 });
    });
  });
});

describe('matchHost: RHEL', () => {
  const rhsa = (overrides: Partial<AdvisoryRecord> = {}) =>
    record({
      os: RHEL9,
      advisory: { id: 'RHSA-2026:0001', source: 'redhat', definition_id: 'rhsa1', title: 't' },
      cves: [{ id: 'CVE-2026-1000' }, { id: 'CVE-2026-1001' }],
      ...overrides,
    });

  it('honours epoch and the arch constraint', () => {
    const fix = rhsa({
      package: { name: 'glibc', arch: { operation: 'pattern match', value: 'aarch64|x86_64' } },
      fixed_version: { raw: '0:2.34-100.el9_4.2', scheme: 'rpm' },
    });
    const at = (version: string, arch: string) =>
      run(host({ os: RHEL9, packages: [{ name: 'glibc', version, arch }] }), [fix]).length;
    expect(at('0:2.34-100.el9_4.1', 'x86_64')).toBe(2);
    expect(at('0:2.34-100.el9_4.1', 'i686')).toBe(0);
    expect(at('0:2.34-100.el9_4.1', 'x86_64_v2')).toBe(0);
    expect(at('1:2.30-1.el9', 'x86_64')).toBe(0);
  });

  it('matches equals arch exactly', () => {
    const fix = rhsa({
      package: { name: 'kernel-zfcpdump', arch: { operation: 'equals', value: 's390x' } },
      fixed_version: { raw: '0:5.14.0-500.el9', scheme: 'rpm' },
    });
    const pkg = (arch: string) => [{ name: 'kernel-zfcpdump', version: '0:5.14.0-1.el9', arch }];
    expect(run(host({ os: RHEL9, packages: pkg('s390x') }), [fix])).toHaveLength(2);
    expect(run(host({ os: RHEL9, packages: pkg('x86_64') }), [fix])).toEqual([]);
  });

  it('keeps the lowest fix across errata and names every advisory that ties', () => {
    const early = rhsa({
      advisory: { id: 'RHSA-A', source: 'redhat', definition_id: 'a', title: 'a' },
      package: { name: 'vim-minimal' },
      fixed_version: { raw: '2:8.2.2637-20.el9_1', scheme: 'rpm' },
      cves: [{ id: 'CVE-1' }],
    });
    const later = rhsa({
      advisory: { id: 'RHSA-B', source: 'redhat', definition_id: 'b', title: 'b' },
      package: { name: 'vim-minimal' },
      fixed_version: { raw: '2:8.2.2637-21.el9', scheme: 'rpm' },
      cves: [{ id: 'CVE-1' }],
    });
    const twin = { ...early, advisory: { ...early.advisory, id: 'RHBA-A', definition_id: 'c' } };
    const h = host({
      os: RHEL9,
      packages: [{ name: 'vim-minimal', version: '2:8.2.2637-16.el9' }],
    });
    const findings = run(h, [later, early, twin]);
    expect(findings).toHaveLength(1);
    expect(findings[0].fixedVersion).toBe('2:8.2.2637-20.el9_1');
    expect(findings[0].advisories.map((a) => a.id)).toEqual(['RHSA-A', 'RHBA-A']);
  });

  describe('srpm sibling expansion', () => {
    const glibcFix = rhsa({
      package: { name: 'glibc' },
      fixed_version: { raw: '0:2.34-100.el9', scheme: 'rpm' },
      cves: [{ id: 'CVE-2026-2000' }],
    });
    const glibc = (name: string, version = '0:2.34-60.el9') => ({
      name,
      version,
      arch: 'x86_64',
      source: `glibc-${version.slice(2)}.src.rpm`,
    });

    it('extends a hit to installed binaries of the same source rpm', () => {
      const findings = run(host({ os: RHEL9, packages: [glibc('glibc'), glibc('glibc-common')] }), [
        glibcFix,
      ]);
      expect(findings.map((f) => [f.package.name, f.why])).toEqual([
        ['glibc', 'glibc 0:2.34-60.el9 is earlier than 0:2.34-100.el9 (RHSA-2026:0001)'],
        [
          'glibc-common',
          'glibc-common 0:2.34-60.el9 is earlier than 0:2.34-100.el9 (RHSA-2026:0001; built from source rpm glibc like glibc)',
        ],
      ]);
    });

    it('does not expand to siblings already at the fix', () => {
      const findings = run(
        host({
          os: RHEL9,
          packages: [glibc('glibc'), glibc('glibc-common', '0:2.34-100.el9')],
        }),
        [glibcFix]
      );
      expect(findings.map((f) => f.package.name)).toEqual(['glibc']);
    });

    it('leaves a sibling the definition lists explicitly to its own row (arch included)', () => {
      const i686Only = rhsa({
        package: { name: 'glibc-common', arch: { operation: 'equals', value: 'i686' } },
        fixed_version: { raw: '0:2.34-100.el9', scheme: 'rpm' },
        cves: [{ id: 'CVE-2026-2000' }],
      });
      const findings = run(host({ os: RHEL9, packages: [glibc('glibc'), glibc('glibc-common')] }), [
        glibcFix,
        i686Only,
      ]);
      expect(findings.map((f) => f.package.name)).toEqual(['glibc']);
    });

    it('does not expand on Ubuntu', () => {
      const fix = record({
        os: UBUNTU,
        package: { name: 'glibc', binaries: ['libc6'] },
        fixed_version: { raw: '2.39-0ubuntu8.4', scheme: 'dpkg' },
      });
      const findings = run(
        host({
          os: UBUNTU,
          packages: [
            { name: 'libc6', version: '2.39-0ubuntu8.3', source: 'glibc' },
            { name: 'libc-bin', version: '2.39-0ubuntu8.3', source: 'glibc' },
          ],
        }),
        [fix]
      );
      expect(findings.map((f) => f.package.name)).toEqual(['libc6']);
    });
  });

  describe('conditions', () => {
    const nodejs = rhsa({
      package: { name: 'nodejs' },
      fixed_version: { raw: '1:18.20.2-1.module+el9.4.0+21700+1b1b1b1b', scheme: 'rpm' },
      cves: [{ id: 'CVE-2026-3000' }],
      conditions: [[{ type: 'module_enabled', module: 'nodejs:18' }]],
    });
    const nodePkg = [{ name: 'nodejs', version: '1:18.19.0-1.module+el9.3.0+20000+1a1a1a1a' }];

    it('reports only when the enabled module matches', () => {
      expect(
        run(host({ os: RHEL9, enabledModules: ['nodejs:18'], packages: nodePkg }), [nodejs])
      ).toEqual([
        expect.objectContaining({
          why: expect.stringMatching(/; module nodejs:18 is enabled\)$/),
        }),
      ]);
      expect(
        run(host({ os: RHEL9, enabledModules: ['nodejs:20'], packages: nodePkg }), [nodejs])
      ).toEqual([]);
    });

    it('requires every condition of an alternative together', () => {
      const both = {
        ...nodejs,
        conditions: [
          [
            { type: 'module_enabled' as const, module: 'nodejs:18' },
            { type: 'module_enabled' as const, module: 'nodejs:18-extra' },
          ],
        ],
      };
      const enabled = (modules: string[]) =>
        run(host({ os: RHEL9, enabledModules: modules, packages: nodePkg }), [both]);
      expect(enabled(['nodejs:18'])).toEqual([]);
      expect(enabled(['nodejs:18', 'nodejs:18-extra'])).toHaveLength(1);
    });

    it('counts unknown host facts instead of reporting', () => {
      const stats: MatchStats = {};
      expect(run(host({ os: RHEL9, packages: nodePkg }), [nodejs], stats)).toEqual([]);
      expect(stats).toEqual({ unknown_module_enabled: 1 });
    });

    it('lets a satisfied alternative win over an unknown one', () => {
      const either = {
        ...nodejs,
        conditions: [
          [{ type: 'module_enabled' as const, module: 'nodejs:18' }],
          [
            {
              type: 'running_kernel' as const,
              package: 'kernel',
              operation: 'less than' as const,
              evr: '0:5.14.0-427.22.1.el9_4',
            },
          ],
        ],
      };
      const stats: MatchStats = {};
      const findings = run(
        host({ os: RHEL9, kernelRelease: '5.14.0-427.13.1.el9_4.x86_64', packages: nodePkg }),
        [either],
        stats
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].why).toMatch(
        /running kernel 5\.14\.0-427\.13\.1\.el9_4\.x86_64 is earlier than/
      );
      expect(stats).toEqual({});
    });

    it('ignores an unknown fact of an alternative that fails on another condition', () => {
      const failing = {
        ...nodejs,
        conditions: [
          [
            { type: 'module_enabled' as const, module: 'nodejs:18' },
            {
              type: 'running_kernel' as const,
              package: 'kernel',
              operation: 'less than' as const,
              evr: '0:5.14.0-427.22.1.el9_4',
            },
          ],
        ],
      };
      const stats: MatchStats = {};
      const findings = run(
        host({ os: RHEL9, kernelRelease: '5.14.0-503.11.1.el9_5.x86_64', packages: nodePkg }),
        [failing],
        stats
      );
      expect(findings).toEqual([]);
      expect(stats).toEqual({});
    });

    it('evaluates running-kernel less-than and equals against uname -r', () => {
      const kernelCore = (operation: 'less than' | 'equals', evr: string) =>
        rhsa({
          package: { name: 'kernel-core' },
          fixed_version: { raw: '0:5.14.0-427.22.1.el9_4', scheme: 'rpm' },
          conditions: [[{ type: 'running_kernel', package: 'kernel', operation, evr }]],
        });
      const at = (kernelRelease: string, r: AdvisoryRecord) =>
        run(
          host({
            os: RHEL9,
            kernelRelease,
            packages: [{ name: 'kernel-core', version: '0:5.14.0-427.13.1.el9_4' }],
          }),
          [r]
        ).length;
      const lt = kernelCore('less than', '0:5.14.0-427.22.1.el9_4');
      expect(at('5.14.0-427.13.1.el9_4.x86_64', lt)).toBe(2);
      expect(at('5.14.0-427.22.1.el9_4.x86_64', lt)).toBe(0);
      const eq = kernelCore('equals', '0:5.14.0-427.13.1.el9_4');
      expect(at('5.14.0-427.13.1.el9_4.x86_64+debug', eq)).toBe(2);
      expect(at('5.14.0-427.13.2.el9_4.x86_64', eq)).toBe(0);
    });
  });
});

describe('helpers', () => {
  it('strips arch and variant suffixes from a RHEL kernel release', () => {
    expect(rhelKernelEvr('5.14.0-427.13.1.el9_4.x86_64')).toBe('0:5.14.0-427.13.1.el9_4');
    expect(rhelKernelEvr('5.14.0-70.22.1.rt21.94.el9_0.x86_64+rt')).toBe(
      '0:5.14.0-70.22.1.rt21.94.el9_0'
    );
    expect(rhelKernelEvr('4.18.0-553.el8_10.aarch64')).toBe('0:4.18.0-553.el8_10');
    expect(rhelKernelEvr('5.14.0-427.13.1.el9_4.aarch64+64k-debug')).toBe(
      '0:5.14.0-427.13.1.el9_4'
    );
  });

  it('reduces a SOURCERPM file name to the source name', () => {
    expect(sourceRpmName('gcc-11.3.1-4.3.el9.src.rpm')).toBe('gcc');
    expect(sourceRpmName('python3.11-3.11.2-2.el9.src.rpm')).toBe('python3.11');
    expect(sourceRpmName('crypto-policies')).toBe('crypto-policies');
  });
});

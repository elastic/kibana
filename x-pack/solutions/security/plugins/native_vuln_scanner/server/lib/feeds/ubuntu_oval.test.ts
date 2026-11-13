/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { dpkgKey } from '../version_compare';
import type { FeedParseResult } from './types';
import { parseUbuntuOval } from './ubuntu_oval';

// Definitions trimmed from com.ubuntu.noble.cve.oval.xml, with every test/object/state/variable
// they reference.
const fixture = readFileSync(join(__dirname, '__fixtures__', 'ubuntu_noble_trimmed.oval.xml'));

const chunked = (bytes: Buffer, size: number): Buffer[] => {
  const chunks: Buffer[] = [];
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.subarray(i, i + size));
  return chunks;
};

describe('parseUbuntuOval', () => {
  let result: FeedParseResult;

  beforeAll(async () => {
    result = await parseUbuntuOval(chunked(fixture, 4096), { release: 'noble' });
  });

  const byCve = (id: string) => result.records.filter((r) => r.advisory.id === id);

  it('reads feed metadata and counts vulnerability definitions only', () => {
    expect(result.os).toEqual({ family: 'ubuntu', version: 'noble' });
    expect(result.snapshotTime).toBe('2026-11-10T00:16:52Z');
    expect(result.definitions).toBe(8);
    expect(result.records.every((r) => r.feed.snapshot_time === result.snapshotTime)).toBe(true);
  });

  it('emits one record per fixed binary group of a source package', () => {
    const samba = byCve('CVE-2018-14628');
    expect(samba.map((r) => [r.package.name, r.fixed_version.raw])).toEqual([
      ['samba', '2:4.19.4+dfsg-3ubuntu1'],
      ['samba', '2:2.8.0+samba4.19.4+dfsg-3ubuntu1'],
    ]);
    expect(samba[0].package.binaries).toContain('libsmbclient');
    expect(samba[1].package.binaries).toEqual(['ldb-tools', 'libldb2', 'python3-ldb']);
    expect(samba[0]).toMatchObject({
      kind: 'package',
      conditions: [],
      advisory: {
        source: 'ubuntu',
        definition_id: 'oval:com.ubuntu.noble:def:2018146280000000',
        title: 'CVE-2018-14628 on Ubuntu 24.04 LTS (noble) - low',
        severity: 'Low',
        published: '2023-01-17T18:15:00Z',
        url: 'https://ubuntu.com/security/CVE-2018-14628',
      },
      fixed_version: { scheme: 'dpkg', key: dpkgKey('2:4.19.4+dfsg-3ubuntu1') },
      cves: [
        {
          id: 'CVE-2018-14628',
          severity: 'low',
          published: '2023-01-17T00:00:00Z',
          cvss: {
            version: '3.1',
            score: 4.3,
            vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N',
          },
        },
      ],
    });
  });

  it('turns kernel fixes into running-kernel records gated on the flavour', () => {
    expect(byCve('CVE-2021-47488')).toEqual([
      expect.objectContaining({
        kind: 'running_kernel',
        package: {
          name: 'linux-raspi',
          release_version: { prefix: '0:', pattern: '^([\\d|\\.]+-\\d+)[-|\\w]+$' },
        },
        fixed_version: { raw: '0:6.8.0-1024', scheme: 'dpkg', key: dpkgKey('0:6.8.0-1024') },
        conditions: [[{ type: 'kernel_release_matches', pattern: '6\\.8\\.0\\-\\d+(\\-raspi)' }]],
      }),
    ]);
  });

  it('keeps only fixed criteria for this release', () => {
    expect(byCve('CVE-2024-6484').map((r) => r.package.binaries)).toEqual([
      ['fonts-glyphicons-halflings'],
      ['libjs-bootstrap'],
    ]);
    // motif "might be affected" is dropped, libxpm is fixed.
    expect(byCve('CVE-2026-94287').map((r) => r.package.name)).toEqual(['libxpm']);
    expect(result.records.map((r) => r.advisory.id)).not.toContain('CVE-2023-35958');
    expect(result.skipped).toEqual({ might_be_affected: 4, other_pocket: 1, unfixed_kernel: 1 });
  });

  it('does not depend on chunk boundaries', async () => {
    const small = await parseUbuntuOval(chunked(fixture, 97), { release: 'noble' });
    expect(small.records).toEqual(result.records);
  });
});

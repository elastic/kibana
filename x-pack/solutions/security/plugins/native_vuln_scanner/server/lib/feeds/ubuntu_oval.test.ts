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
import { parseUbuntuOval, UBUNTU_SOLUTION_MAX_CHARS } from './ubuntu_oval';

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
    expect(samba.map((r) => [r.package.name, r.fixed_version?.raw])).toEqual([
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
    expect(small.knowledge).toEqual(result.knowledge);
    expect(small.attribution).toBe(result.attribution);
  });

  describe('knowledge', () => {
    it('keeps the vendor description and reads the feed copyright once', () => {
      expect(result.attribution).toBe('Copyright (C) 2026 Canonical Ltd.');
      const entry = result.knowledge.get('cve:ubuntu:noble:CVE-2018-14628');
      expect(entry).toMatchObject({
        kind: 'cve',
        id: 'CVE-2018-14628',
        url: 'https://ubuntu.com/security/CVE-2018-14628',
        severity: 'low',
      });
      expect(entry?.description).toMatch(/^An information leak vulnerability/);
      expect(entry?.description).not.toContain('Update Instructions');
    });

    it('splits the Update Instructions into the solution and marks the text as cut', () => {
      const entry = result.knowledge.get('cve:ubuntu:noble:CVE-2018-14628');
      expect(entry?.solution).toMatch(/^Run `sudo pro fix CVE-2018-14628`/);
      expect(entry?.solution).toContain('samba - 2:4.19.4+dfsg-3ubuntu1');
      expect(entry?.truncated).toBe(true);
    });

    it('bounds a long package-version list, keeps the command and the first packages, and marks it cut', async () => {
      const filler = 'pkg-a - 1.0 '.repeat(2000);
      const long = Buffer.from(
        fixture
          .toString('utf8')
          .replace(
            'to the following package versions:',
            `to the following package versions: ${filler}`
          )
      );
      const { knowledge } = await parseUbuntuOval(chunked(long, 4096), { release: 'noble' });
      const entry = knowledge.get('cve:ubuntu:noble:CVE-2018-14628');
      expect(entry?.solution).toHaveLength(UBUNTU_SOLUTION_MAX_CHARS);
      expect(entry?.solution).toMatch(/^Run `sudo pro fix CVE-2018-14628`/);
      expect(entry?.solution).toContain('pkg-a - 1.0');
      expect(entry?.truncated).toBe(true);
      expect(entry?.description).toMatch(/^An information leak vulnerability/);
    });

    it('leaves text without instructions whole', () => {
      const entry = result.knowledge.get('cve:ubuntu:noble:CVE-2024-38828');
      expect(entry?.solution).toBeUndefined();
      expect(entry?.truncated).toBeUndefined();
    });

    it('turns a "Rejected reason:" description into a rejected entry holding the reason', () => {
      const entry = result.knowledge.get('cve:ubuntu:noble:CVE-2024-6484');
      expect(entry?.kind).toBe('rejected');
      // The "Rejected reason:" prefix is stripped, so the text is an excerpt.
      expect(entry?.truncated).toBe(true);
      expect(entry?.description).toMatch(/^This was not a security issue in Bootstrap/);
    });

    it('writes no entry for an empty description', () => {
      expect(
        [...result.knowledge.values()].every((e) => Boolean(e.description || e.solution))
      ).toBe(true);
    });

    it('never puts vendor text on the advisory records', () => {
      expect(JSON.stringify(result.records)).not.toContain('information leak vulnerability');
    });
  });
});

describe('parseUbuntuOval with includeUnfixed', () => {
  let result: FeedParseResult;

  beforeAll(async () => {
    result = await parseUbuntuOval(chunked(fixture, 4096), {
      release: 'noble',
      includeUnfixed: true,
    });
  });

  const byCve = (id: string) => result.records.filter((r) => r.advisory.id === id);

  it('emits unfixed package records for might-be-affected criteria', () => {
    const gtkwave = byCve('CVE-2023-35958');
    expect(gtkwave).toHaveLength(1);
    expect(gtkwave[0]).toMatchObject({
      kind: 'package',
      unfixed: true,
      vendor_reason: 'might be affected',
      package: { name: 'gtkwave', binaries: ['gtkwave'] },
      conditions: [],
    });
    expect(gtkwave[0].fixed_version).toBeUndefined();

    const motif = byCve('CVE-2026-94287').find((r) => r.package.name === 'motif');
    expect(motif).toMatchObject({ unfixed: true, vendor_reason: 'might be affected' });
    expect(motif?.fixed_version).toBeUndefined();
  });

  it('still skips other pockets and reports the remaining skips', () => {
    expect(result.records.every((r) => r.package.name !== 'libspring-java')).toBe(true);
    // The kernel-only branch was claimed for synthesis, so it is not also reported skipped.
    expect(result.skipped).toEqual({ might_be_affected: 1, other_pocket: 1 });
  });

  it('turns kernel-only definitions into unfixed running-kernel records', () => {
    const kernel = byCve('CVE-2021-47488').filter((r) => r.unfixed);
    expect(kernel).toHaveLength(1);
    expect(kernel[0]).toMatchObject({
      kind: 'running_kernel',
      unfixed: true,
      vendor_reason: 'might be affected',
      package: { name: 'linux-raspi-realtime' },
      conditions: [
        [{ type: 'kernel_release_matches', pattern: '6\\.8\\.0\\-\\d+(\\-raspi\\-realtime)' }],
      ],
    });
    expect(kernel[0].fixed_version).toBeUndefined();
  });
});

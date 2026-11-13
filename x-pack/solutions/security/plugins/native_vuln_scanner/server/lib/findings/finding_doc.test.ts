/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Finding } from '../matcher';
import { FINDINGS_DATASET } from './constants';
import { findingId, toFindingDoc, toSeverity } from './finding_doc';
import type { HostMeta } from './finding_doc';

const HOST: HostMeta = { id: 'h1', name: 'web-1', os: { family: 'rhel', version: '9' } };
const CTX = { now: '2026-11-13T10:00:00.000Z', runId: 'run-1' };

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  hostId: 'h1',
  cve: {
    id: 'CVE-2026-23868',
    url: 'https://access.redhat.com/security/cve/CVE-2026-23868',
    published: '2026-03-10T18:53:00Z',
    severity: 'important',
    cvss: { version: '3.1', score: 7, vector: 'CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:H' },
    cwe: 'CWE-825',
  },
  kind: 'package',
  package: { name: 'glibc', version: '0:2.34-60.el9', arch: 'x86_64', source: 'glibc' },
  fixedVersion: '0:2.34-83.el9_3.7',
  scheme: 'rpm',
  advisories: [
    {
      id: 'RHSA-2026:1234',
      source: 'redhat',
      definition_id: 'oval:com.redhat.rhsa:def:20261234',
      title: 'RHSA-2026:1234: glibc security update (Important)',
      url: 'https://access.redhat.com/errata/RHSA-2026:1234',
      severity: 'Important',
    },
  ],
  why: 'glibc 0:2.34-60.el9 is earlier than 0:2.34-83.el9_3.7 (RHSA-2026:1234)',
  feedSnapshotTime: '2026-11-12T03:00:00Z',
  ...overrides,
});

describe('toSeverity', () => {
  it.each([
    ['important', 'HIGH'],
    ['Moderate', 'MEDIUM'],
    ['negligible', 'LOW'],
    ['critical', 'CRITICAL'],
    ['untriaged', 'UNKNOWN'],
    ['constructor', 'UNKNOWN'],
    [' __proto__ ', 'UNKNOWN'],
    [undefined, 'UNKNOWN'],
  ])('maps %s to %s', (label, expected) => {
    expect(toSeverity(label)).toBe(expected);
  });

  it('falls back to the next label when the first is unknown', () => {
    expect(toSeverity('untriaged', undefined, 'Medium')).toBe('MEDIUM');
  });
});

describe('findingId', () => {
  it('is stable and distinguishes architecture and installed version', () => {
    const base = findingId(finding());
    expect(findingId(finding())).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    const other = finding();
    expect(findingId({ ...other, package: { ...other.package, arch: 'i686' } })).not.toBe(base);
    expect(
      findingId({ ...other, package: { ...other.package, version: '0:2.34-61.el9' } })
    ).not.toBe(base);
  });
});

describe('toFindingDoc', () => {
  it('builds the fields the CNVM UI reads', () => {
    const doc = toFindingDoc(finding(), HOST, CTX);
    expect(doc).toMatchObject({
      '@timestamp': CTX.now,
      event: { kind: 'state', id: findingId(finding()), dataset: FINDINGS_DATASET },
      data_stream: { dataset: FINDINGS_DATASET },
      observer: { vendor: 'Elastic' },
      resource: { id: 'h1', name: 'web-1' },
      host: { id: 'h1', name: 'web-1' },
      package: {
        name: 'glibc',
        version: '0:2.34-60.el9',
        fixed_version: '0:2.34-83.el9_3.7',
        architecture: 'x86_64',
        type: 'rpm',
      },
      vulnerability: {
        id: 'CVE-2026-23868',
        title: 'RHSA-2026:1234: glibc security update (Important)',
        severity: 'HIGH',
        score: { base: 7, version: '3.1' },
        cvss: {
          redhat: { V3Score: 7, V3Vector: 'CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:H' },
        },
        cwe: ['CWE-825'],
        published_date: '2026-03-10T18:53:00Z',
        data_source: {
          ID: 'RHSA-2026:1234',
          Name: 'Red Hat OVAL',
          URL: 'https://access.redhat.com/errata/RHSA-2026:1234',
        },
      },
      native_vuln_scanner: {
        state: 'new',
        confidence: 'confirmed',
        run_id: 'run-1',
        first_seen: CTX.now,
        last_seen: CTX.now,
        feed_snapshot_time: '2026-11-12T03:00:00Z',
        source_package: 'glibc',
      },
    });
    expect(doc.vulnerability.description).toContain('is earlier than 0:2.34-83.el9_3.7');
  });

  it('puts a CVE link first so the UI can pair it with the id', () => {
    const { reference } = toFindingDoc(finding(), HOST, CTX).vulnerability;
    expect(reference[0]).toBe('https://access.redhat.com/security/cve/CVE-2026-23868');
    expect(reference).toContain('https://access.redhat.com/errata/RHSA-2026:1234');
  });

  it('falls back to cve.org without a feed URL and to the CVE id without a title', () => {
    const f = finding({ advisories: [] });
    const doc = toFindingDoc({ ...f, cve: { id: 'CVE-2024-1' } }, HOST, CTX);
    expect(doc.vulnerability).toMatchObject({
      reference: ['https://www.cve.org/CVERecord?id=CVE-2024-1'],
      title: 'CVE-2024-1',
      severity: 'UNKNOWN',
      data_source: { ID: 'CVE-2024-1', Name: 'Red Hat OVAL' },
    });
    expect(doc.vulnerability.cvss).toBeUndefined();
  });

  it('rejects host metadata of another host', () => {
    expect(() => toFindingDoc(finding(), { ...HOST, id: 'h9' }, CTX)).toThrow(/does not belong/);
  });

  it('files Ubuntu CVSS under the nvd key the flyout renders', () => {
    const f = finding();
    const [advisory] = f.advisories;
    const doc = toFindingDoc({ ...f, advisories: [{ ...advisory, source: 'ubuntu' }] }, HOST, CTX);
    expect(Object.keys(doc.vulnerability.cvss ?? {})).toEqual(['nvd']);
    expect(doc.vulnerability.data_source.Name).toBe('Ubuntu OVAL');
  });

  it('derives the CVSS key and data source from the scheme when no advisory is attached', () => {
    const doc = toFindingDoc(finding({ advisories: [] }), HOST, CTX);
    expect(Object.keys(doc.vulnerability.cvss ?? {})).toEqual(['redhat']);
    expect(doc.vulnerability.data_source.Name).toBe('Red Hat OVAL');
  });

  it('stores CVSS v2 scores under the V2 keys', () => {
    const f = finding();
    const doc = toFindingDoc(
      { ...f, cve: { ...f.cve, cvss: { version: '2.0', score: 5, vector: 'AV:N/AC:L/Au:N' } } },
      HOST,
      CTX
    );
    expect(doc.vulnerability.cvss).toEqual({ redhat: { V2Score: 5, V2Vector: 'AV:N/AC:L/Au:N' } });
  });

  it('marks Ubuntu findings as deb and uses the host id as the name fallback', () => {
    const doc = toFindingDoc(
      finding({
        hostId: 'h2',
        scheme: 'dpkg',
        package: { name: 'openssl', version: '3.0.13-0ubuntu3' },
        fixedVersion: '3.0.13-0ubuntu3.4',
      }),
      { id: 'h2', os: { family: 'ubuntu', version: 'noble' } },
      CTX
    );
    expect(doc.package).toEqual({
      name: 'openssl',
      version: '3.0.13-0ubuntu3',
      fixed_version: '3.0.13-0ubuntu3.4',
      type: 'deb',
    });
    expect(doc.resource).toEqual({ id: 'h2', name: 'h2' });
  });
});

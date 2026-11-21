/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeEntry } from '../feeds/types';
import type { Finding } from '../matcher';
import { FINDINGS_DATASET } from './constants';
import { FINDING_DESCRIPTION_MAX, findingId, toFindingDoc, toSeverity } from './finding_doc';
import { findingsMappings } from './mappings';
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

/**
 * Every leaf path of `value` that the strict mapping does not declare. Arrays are transparent
 * (an array of objects maps as the object), and `undefined` values are not serialized.
 */
const unmappedPaths = (
  value: unknown,
  mapping: { properties?: Record<string, unknown> } | undefined,
  path = ''
): string[] => {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => unmappedPaths(item, mapping, path));
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const here = path ? `${path}.${key}` : key;
    const childMapping = mapping?.properties?.[key] as typeof mapping;
    return childMapping
      ? unmappedPaths(child, childMapping, here)
      : child === undefined
      ? []
      : [here];
  });
};

describe('toFindingDoc', () => {
  it('writes only fields the strict findings mapping declares, optional fields included', () => {
    const [advisory] = finding().advisories;
    const doc = toFindingDoc(
      finding({
        unfixed: true,
        vendorReason: 'Will not fix',
        advisories: [
          {
            ...advisory,
            refs: [
              { id: 'RHSA-2026:1234', url: 'https://access.redhat.com/errata/RHSA-2026:1234' },
              { id: 'CVE-2026-9999', url: 'https://access.redhat.com/security/cve/CVE-2026-9999' },
            ],
          },
        ],
      }),
      { ...HOST, os: { ...HOST.os, name: 'Red Hat Enterprise Linux 9', kernel: '5.14.0-362.el9' } },
      {
        ...CTX,
        kev: {
          dateAdded: '2026-11-18',
          dueDate: '2026-12-02',
          knownRansomwareCampaignUse: 'Known',
        },
      }
    );
    // Guard the guard: the fixture must populate the optional fields it claims to cover.
    expect(doc.host.os.kernel).toBeDefined();
    expect(doc.vulnerability.kev).toBeDefined();
    expect(doc.native_vuln_scanner.unfixed).toBe(true);
    expect(doc.native_vuln_scanner.vendor_reason).toBeDefined();
    expect(findingsMappings.dynamic).toBe('strict');
    expect(unmappedPaths(JSON.parse(JSON.stringify(doc)), findingsMappings)).toEqual([]);
  });

  it('detects an unmapped field (the walker is not vacuous)', () => {
    expect(
      unmappedPaths(
        { native_vuln_scanner: { advisories: [{ id: 'a', refs: [] }] } },
        findingsMappings
      )
    ).toEqual(['native_vuln_scanner.advisories.refs']);
  });

  it('omits undefined optional advisory fields instead of writing them', () => {
    const [advisory] = finding().advisories;
    const doc = toFindingDoc(
      finding({ advisories: [{ ...advisory, url: undefined, severity: undefined }] }),
      HOST,
      CTX
    );
    const [written] = doc.native_vuln_scanner.advisories;
    expect(Object.keys(written).sort()).toEqual(['definition_id', 'id', 'source', 'title']);
  });

  it('builds the fields the CNVM UI reads', () => {
    const doc = toFindingDoc(finding(), HOST, CTX);
    expect(doc).toMatchObject({
      '@timestamp': CTX.now,
      event: { kind: 'state', id: findingId(finding()), dataset: FINDINGS_DATASET },
      data_stream: { dataset: FINDINGS_DATASET },
      observer: { vendor: 'Elastic native scanner' },
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
    // No vendor text parsed: the advisory title stands in, and the reason stays in `why` only.
    expect(doc.vulnerability.description).toBe('RHSA-2026:1234: glibc security update (Important)');
    expect(doc.native_vuln_scanner.why).toContain('is earlier than 0:2.34-83.el9_3.7');
    expect(doc.native_vuln_scanner.knowledge_id).toBe('cve:redhat:9:CVE-2026-23868');
  });

  describe('vendor description', () => {
    const entry = (overrides: Partial<KnowledgeEntry>): KnowledgeEntry => ({
      kind: 'cve',
      id: 'CVE-2026-23868',
      ...overrides,
    });
    const describeWith = (knowledge: Map<string, KnowledgeEntry>) =>
      toFindingDoc(finding(), HOST, { ...CTX, knowledge }).vulnerability.description;

    it('uses the CVE description, cut to 2 KB, and keeps the source link', () => {
      const long = 'a'.repeat(FINDING_DESCRIPTION_MAX + 500);
      const knowledge = new Map([['cve:redhat:9:CVE-2026-23868', entry({ description: long })]]);
      const doc = toFindingDoc(finding(), HOST, { ...CTX, knowledge });
      expect(doc.vulnerability.description).toHaveLength(FINDING_DESCRIPTION_MAX);
      expect(doc.vulnerability.reference).toContain(finding().cve.url);
    });

    it('does not end on half a surrogate pair', () => {
      const text = `${'a'.repeat(FINDING_DESCRIPTION_MAX - 1)}😀`;
      const knowledge = new Map([['cve:redhat:9:CVE-2026-23868', entry({ description: text })]]);
      const description = describeWith(knowledge);
      expect(description).toBe('a'.repeat(FINDING_DESCRIPTION_MAX - 1));
    });

    it('falls back to the advisory summary when the CVE has no text', () => {
      const knowledge = new Map<string, KnowledgeEntry>([
        [
          'adv:redhat:9:RHSA-2026:1234',
          { kind: 'advisory', id: 'RHSA-2026:1234', summary: 'An update for glibc.' },
        ],
      ]);
      expect(describeWith(knowledge)).toBe('An update for glibc.');
    });
  });

  it('adds a kev block only for a CVE in the KEV catalog', () => {
    const listed = toFindingDoc(finding(), HOST, {
      ...CTX,
      kev: {
        dateAdded: '2026-11-18',
        dueDate: '2026-12-02',
        knownRansomwareCampaignUse: 'Known',
      },
    });
    expect(listed.vulnerability.kev).toEqual({
      known_exploited: true,
      date_added: '2026-11-18',
      due_date: '2026-12-02',
      ransomware_use: 'Known',
    });
    expect(toFindingDoc(finding(), HOST, CTX).vulnerability).not.toHaveProperty('kev');
  });

  it('puts a CVE link first so the UI can pair it with the id', () => {
    const { reference } = toFindingDoc(finding(), HOST, CTX).vulnerability;
    expect(reference[0]).toBe('https://access.redhat.com/security/cve/CVE-2026-23868');
    expect(reference).toContain('https://access.redhat.com/errata/RHSA-2026:1234');
  });

  it('omits fixed_version and marks unfixed findings', () => {
    const doc = toFindingDoc(
      finding({
        fixedVersion: undefined,
        unfixed: true,
        vendorReason: 'Will not fix',
        why: 'tar 1.34 is installed with no fixed version yet (CVE-2005-2541)',
      }),
      HOST,
      CTX
    );
    expect(doc.package).not.toHaveProperty('fixed_version');
    expect(doc.native_vuln_scanner).toMatchObject({
      state: 'unfixed',
      unfixed: true,
      vendor_reason: 'Will not fix',
    });
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

  it('lists CVE-source references first, then other OVAL refs, the CVE link and advisory urls, deduped', () => {
    const [advisory] = finding().advisories;
    const doc = toFindingDoc(
      {
        ...finding(),
        advisories: [
          {
            ...advisory,
            refs: [
              { id: 'RHSA-2026:1234', url: 'https://access.redhat.com/errata/RHSA-2026:1234' },
              {
                id: 'CVE-2026-23868',
                url: 'https://access.redhat.com/security/cve/CVE-2026-23868',
              },
              { id: 'CVE-2026-9999', url: 'https://access.redhat.com/security/cve/CVE-2026-9999' },
            ],
          },
        ],
      },
      HOST,
      CTX
    );
    expect(doc.vulnerability.reference).toEqual([
      'https://access.redhat.com/security/cve/CVE-2026-23868',
      'https://access.redhat.com/security/cve/CVE-2026-9999',
      'https://access.redhat.com/errata/RHSA-2026:1234',
    ]);
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

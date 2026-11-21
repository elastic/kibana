/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeEntry } from '../feeds/types';
import { KNOWLEDGE_CAPS } from './constants';
import type { KnowledgeDocContext } from './knowledge_doc';
import { toKnowledgeDoc } from './knowledge_doc';
import { knowledgeMappings } from './mappings';

const NOW = '2026-11-13T10:00:00.000Z';
const ubuntu: KnowledgeDocContext = {
  source: 'ubuntu',
  os: { family: 'ubuntu', version: 'noble' },
  attribution: 'Copyright (C) 2026 Canonical Ltd.',
  snapshotTime: '2026-11-12T03:00:00Z',
  now: NOW,
};
const redhat: KnowledgeDocContext = {
  source: 'redhat',
  os: { family: 'rhel', version: '9' },
  now: NOW,
};

const cveEntry = (extra: Partial<KnowledgeEntry> = {}): KnowledgeEntry => ({
  kind: 'cve',
  id: 'CVE-2026-1',
  description: 'A flaw was found.',
  impact: 'Moderate',
  solution: 'Update the package.',
  workaround: 'Disable the feature.',
  references: ['https://example.com/a'],
  published: '2026-03-10T18:53:00Z',
  modified: '2026-03-11T00:00:00Z',
  url: 'https://ubuntu.com/security/CVE-2026-1',
  ...extra,
});

const advisoryEntry: KnowledgeEntry = {
  kind: 'advisory',
  id: 'RHSA-2026:1',
  title: 'RHSA-2026:1: glibc security update',
  summary: 'An update for glibc.',
  url: 'https://access.redhat.com/errata/RHSA-2026:1',
  severity: 'Important',
  cves: ['CVE-2026-1'],
};

// Same walker as the findings test: arrays are transparent, undefined is not serialized.
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

describe('toKnowledgeDoc', () => {
  it('writes only fields the strict knowledge mapping declares', () => {
    const docs = [
      toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry(), ubuntu),
      toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry({ kind: 'rejected' }), ubuntu),
      toKnowledgeDoc('adv:redhat:9:RHSA-2026:1', advisoryEntry, redhat),
    ];
    for (const doc of docs) {
      expect(
        unmappedPaths(doc, knowledgeMappings as { properties: Record<string, unknown> })
      ).toEqual([]);
    }
  });

  it('builds a CVE doc with the vendor text and no advisory block', () => {
    const doc = toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry(), ubuntu);
    expect(doc).toMatchObject({
      native_vuln_scanner: { knowledge_id: 'cve:ubuntu:noble:CVE-2026-1' },
      kind: 'cve',
      source: 'ubuntu',
      vulnerability: { id: 'CVE-2026-1', description: 'A flaw was found.' },
      impact: 'Moderate',
      solution: 'Update the package.',
      workaround: 'Disable the feature.',
      vendor_modified: '2026-03-11T00:00:00Z',
      feed_snapshot_time: '2026-11-12T03:00:00Z',
      last_seen_in_feed: NOW,
    });
    expect(doc.advisory).toBeUndefined();
  });

  it('builds an advisory doc keyed by the advisory id', () => {
    const doc = toKnowledgeDoc('adv:redhat:9:RHSA-2026:1', advisoryEntry, redhat);
    expect(doc.advisory).toEqual({
      id: 'RHSA-2026:1',
      title: 'RHSA-2026:1: glibc security update',
      summary: 'An update for glibc.',
      url: 'https://access.redhat.com/errata/RHSA-2026:1',
      severity: 'Important',
      cves: ['CVE-2026-1'],
    });
    expect(doc.vulnerability).toBeUndefined();
  });

  describe('licence', () => {
    it('carries the Ubuntu CC-BY-SA block and the feed copyright line', () => {
      const doc = toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry(), ubuntu);
      expect(doc).toMatchObject({
        attribution: 'Copyright (C) 2026 Canonical Ltd.',
        license: 'CC-BY-SA-4.0',
        license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
        source_url: 'https://ubuntu.com/security/CVE-2026-1',
      });
    });

    it('carries the Red Hat CC-BY block and falls back to the vendor name and source page', () => {
      const doc = toKnowledgeDoc(
        'cve:redhat:9:CVE-2026-2',
        cveEntry({ id: 'CVE-2026-2', url: undefined }),
        redhat
      );
      expect(doc).toMatchObject({
        attribution: 'Red Hat, Inc.',
        license: 'CC-BY-4.0',
        license_url: 'https://creativecommons.org/licenses/by/4.0/',
        source_url: 'https://access.redhat.com/security/cve/CVE-2026-2',
      });
    });
  });

  describe('modified', () => {
    it('is false when the text is stored whole', () => {
      expect(toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry(), ubuntu).modified).toBe(
        false
      );
    });

    it('is true when the parser cut or split the text', () => {
      const doc = toKnowledgeDoc(
        'cve:ubuntu:noble:CVE-2026-1',
        cveEntry({ truncated: true }),
        ubuntu
      );
      expect(doc.modified).toBe(true);
    });

    it('is true when a KB cap cuts a field', () => {
      const long = 'a'.repeat(KNOWLEDGE_CAPS.impact + 1);
      const doc = toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry({ impact: long }), ubuntu);
      expect(doc.impact).toHaveLength(KNOWLEDGE_CAPS.impact);
      expect(doc.modified).toBe(true);
    });

    it('is true when the reference list is cut', () => {
      const references = Array.from({ length: KNOWLEDGE_CAPS.references + 1 }, (_, i) => `u${i}`);
      const doc = toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry({ references }), ubuntu);
      expect(doc.references).toHaveLength(KNOWLEDGE_CAPS.references);
      expect(doc.modified).toBe(true);
    });

    it('is true when an advisory lists more CVEs than the cap', () => {
      const cves = Array.from({ length: KNOWLEDGE_CAPS.cves + 5 }, (_, i) => `CVE-2026-${i}`);
      const doc = toKnowledgeDoc('adv:redhat:9:RHSA-2026:1', { ...advisoryEntry, cves }, redhat);
      expect(doc.advisory?.cves).toHaveLength(KNOWLEDGE_CAPS.cves);
      expect(doc.modified).toBe(true);
    });
  });

  describe('caps', () => {
    it('cuts each field at its own bound', () => {
      const doc = toKnowledgeDoc(
        'cve:ubuntu:noble:CVE-2026-1',
        cveEntry({
          description: 'd'.repeat(KNOWLEDGE_CAPS.description + 10),
          solution: 's'.repeat(KNOWLEDGE_CAPS.solution + 10),
          workaround: 'w'.repeat(KNOWLEDGE_CAPS.workaround + 10),
        }),
        ubuntu
      );
      expect(doc.vulnerability?.description).toHaveLength(KNOWLEDGE_CAPS.description);
      expect(doc.solution).toHaveLength(KNOWLEDGE_CAPS.solution);
      expect(doc.workaround).toHaveLength(KNOWLEDGE_CAPS.workaround);
    });

    it('never ends on half a surrogate pair', () => {
      const text = `${'a'.repeat(KNOWLEDGE_CAPS.impact - 1)}😀tail`;
      const doc = toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', cveEntry({ impact: text }), ubuntu);
      expect(doc.impact).toBe('a'.repeat(KNOWLEDGE_CAPS.impact - 1));
      expect(doc.modified).toBe(true);
    });
  });

  describe('content_hash', () => {
    const hash = (entry: KnowledgeEntry, ctx: KnowledgeDocContext) =>
      toKnowledgeDoc('cve:ubuntu:noble:CVE-2026-1', entry, ctx).content_hash;

    it('is a stable sha256 hex digest', () => {
      expect(hash(cveEntry(), ubuntu)).toMatch(/^[0-9a-f]{64}$/);
      expect(hash(cveEntry(), ubuntu)).toBe(hash(cveEntry(), ubuntu));
    });

    it('ignores the run time and the feed snapshot time', () => {
      const later = {
        ...ubuntu,
        now: '2026-12-01T00:00:00.000Z',
        snapshotTime: '2026-11-30T00:00:00Z',
      };
      expect(hash(cveEntry(), later)).toBe(hash(cveEntry(), ubuntu));
    });

    it('changes with the text, the attribution or the licence block', () => {
      const base = hash(cveEntry(), ubuntu);
      expect(hash(cveEntry({ description: 'Different.' }), ubuntu)).not.toBe(base);
      expect(hash(cveEntry(), { ...ubuntu, attribution: 'Someone else' })).not.toBe(base);
      expect(hash(cveEntry(), { ...redhat })).not.toBe(base);
    });
  });
});

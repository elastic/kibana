/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { rpmKey } from '../version_compare';
import { MAX_DOCUMENT_BYTES, readJsonDocuments } from './json';
import { MAX_KEPT_TEXT_CHARS } from './oval';
import { parseRhelCsaf } from './rhel_csaf';

// Advisory RHBA-2026:21388 (cockpit) trimmed to the product tree and CVE entry the parser reads.
const fixtureText = readFileSync(
  join(__dirname, '__fixtures__', 'csaf_rhel10_trimmed.json'),
  'utf8'
);
const feed = `[${fixtureText}]`;

describe('parseRhelCsaf', () => {
  it('emits one record per installed-arch fixed package, dropping noarch and src', async () => {
    const result = await parseRhelCsaf([feed], { major: '10' });
    expect(result.os).toEqual({ family: 'rhel', version: '10' });
    expect(result.definitions).toBe(1);
    expect(result.snapshotTime).toBe('2026-11-07T05:03:28+00:00');
    expect(result.records.map((r) => r.package?.name).sort()).toEqual([
      'cockpit',
      'cockpit-debuginfo',
      'cockpit-debugsource',
    ]);
    for (const record of result.records) {
      expect(record.package?.arch).toEqual({ operation: 'equals', value: 'x86_64' });
      expect(record.fixed_version).toEqual({
        raw: '0:356.1-1.el10_2',
        scheme: 'rpm',
        key: rpmKey('0:356.1-1.el10_2'),
      });
    }
  });

  it('carries advisory and CVE details', async () => {
    const [record] = (await parseRhelCsaf([feed], { major: '10' })).records;
    expect(record.advisory).toMatchObject({
      id: 'RHBA-2026:21388',
      source: 'redhat',
      url: 'https://access.redhat.com/errata/RHBA-2026:21388',
    });
    expect(record.cves).toHaveLength(1);
    expect(record.cves[0]).toMatchObject({
      id: 'CVE-2026-2950',
      url: 'https://access.redhat.com/security/cve/CVE-2026-2950',
      severity: 'Medium',
      cvss: { score: 6.5 },
    });
  });

  describe('knowledge', () => {
    interface Doc {
      document: { notes: unknown[]; legal_disclaimer?: string };
      vulnerabilities: Array<Record<string, unknown>>;
    }
    const withText = (mutate: (doc: Doc) => void): string => {
      const doc: Doc = JSON.parse(fixtureText);
      mutate(doc);
      return `[${JSON.stringify(doc)}]`;
    };

    it('keeps the advisory topic and the one remediation the fixture has, nothing else', async () => {
      const result = await parseRhelCsaf([feed], { major: '10' });
      expect(result.attribution).toBe('Red Hat, Inc.');
      expect(result.knowledge.get('adv:redhat:10:RHBA-2026:21388')).toMatchObject({
        kind: 'advisory',
        summary: 'An update for cockpit is now available for Red Hat Enterprise Linux 10.',
        cves: ['CVE-2026-2950'],
      });
      const cve = result.knowledge.get('cve:redhat:10:CVE-2026-2950');
      expect(cve?.solution).toBe(
        'For details on how to apply this update, which includes the changes described in'
      );
      expect(cve?.description).toBeUndefined();
      expect(cve?.impact).toBeUndefined();
      expect(cve?.workaround).toBeUndefined();
    });

    it('maps notes, threats and remediations onto the KB fields', async () => {
      const body = withText((doc) => {
        const [vuln] = doc.vulnerabilities;
        vuln.notes = [
          { category: 'description', text: 'Lodash allows prototype pollution.' },
          { category: 'summary', text: 'A flaw was found in lodash.' },
        ];
        vuln.threats = [{ category: 'impact', details: 'Moderate' }];
        vuln.remediations = [
          { category: 'workaround', details: 'Do not pass user paths to _.unset.' },
          { category: 'vendor_fix', details: 'Apply RHBA-2026:21388.' },
        ];
      });
      const result = await parseRhelCsaf([body], { major: '10' });
      expect(result.knowledge.get('cve:redhat:10:CVE-2026-2950')).toMatchObject({
        kind: 'cve',
        description: 'Lodash allows prototype pollution.',
        impact: 'A flaw was found in lodash.\n\nModerate',
        solution: 'Apply RHBA-2026:21388.',
        workaround: 'Do not pass user paths to _.unset.',
        // The impact joins two notes, so it is no longer the vendor's verbatim text.
        truncated: true,
      });
    });

    it('does not mark an impact taken from a single note as modified', async () => {
      const body = withText((doc) => {
        doc.vulnerabilities[0].notes = [{ category: 'summary', text: 'A flaw was found.' }];
        doc.vulnerabilities[0].threats = [];
      });
      const result = await parseRhelCsaf([body], { major: '10' });
      const entry = result.knowledge.get('cve:redhat:10:CVE-2026-2950');
      expect(entry?.impact).toBe('A flaw was found.');
      expect(entry?.truncated).toBeUndefined();
    });

    it('uses none_available as the solution when there is no vendor fix', async () => {
      const body = withText((doc) => {
        doc.vulnerabilities[0].remediations = [
          { category: 'none_available', details: 'Affected, no fix planned.' },
        ];
      });
      const result = await parseRhelCsaf([body], { major: '10' });
      expect(result.knowledge.get('cve:redhat:10:CVE-2026-2950')?.solution).toBe(
        'Affected, no fix planned.'
      );
    });

    it('never copies the legal disclaimer or distribution text', async () => {
      const body = withText((doc) => {
        doc.document.legal_disclaimer = 'LEGAL-DISCLAIMER-TEXT';
      });
      const result = await parseRhelCsaf([body], { major: '10' });
      const stored = JSON.stringify([...result.knowledge.values()]);
      expect(stored).not.toContain('LEGAL-DISCLAIMER-TEXT');
      expect(stored).not.toContain('All rights reserved');
      expect(result.attribution).toBe('Red Hat, Inc.');
    });

    it('cuts long text without splitting a surrogate pair and marks it truncated', async () => {
      const long = `${'a'.repeat(MAX_KEPT_TEXT_CHARS - 1)}😀tail`;
      const body = withText((doc) => {
        doc.vulnerabilities[0].notes = [{ category: 'description', text: long }];
      });
      const result = await parseRhelCsaf([body], { major: '10' });
      const cve = result.knowledge.get('cve:redhat:10:CVE-2026-2950');
      expect(cve?.description).toBe('a'.repeat(MAX_KEPT_TEXT_CHARS - 1));
      expect(cve?.truncated).toBe(true);
    });

    it('keeps the first advisory text when a CVE repeats', async () => {
      const second = JSON.parse(fixtureText);
      second.document.tracking.id = 'RHBA-2026:99999';
      second.vulnerabilities[0].notes = [{ category: 'description', text: 'second' }];
      const first = JSON.parse(fixtureText);
      first.vulnerabilities[0].notes = [{ category: 'description', text: 'first' }];
      const result = await parseRhelCsaf([JSON.stringify([first, second])], { major: '10' });
      expect(result.knowledge.get('cve:redhat:10:CVE-2026-2950')?.description).toBe('first');
      expect(result.knowledge.has('adv:redhat:10:RHBA-2026:99999')).toBe(true);
    });
  });

  it('yields nothing for a major the advisory does not touch', async () => {
    const result = await parseRhelCsaf([feed], { major: '9' });
    expect(result.records).toEqual([]);
    expect(result.definitions).toBe(0);
  });

  it('counts a document without a tracking id as skipped', async () => {
    const result = await parseRhelCsaf([`[{"document":{}},${fixtureText}]`], { major: '10' });
    expect(result.skipped).toEqual({ malformed_document: 1 });
    expect(result.records).toHaveLength(3);
  });

  it('ignores fixed ids that belong to non-main streams', async () => {
    const doc = JSON.parse(fixtureText);
    // Rename the stream groups so they no longer match the main-stream pattern (EUS-style).
    const rename = (nodes: Array<{ name?: string; branches?: unknown[] }>): void => {
      for (const n of nodes) {
        if (n.name?.startsWith('Red Hat Enterprise Linux ')) {
          n.name = n.name.replace('Red Hat Enterprise Linux', 'Red Hat Enterprise Linux EUS');
        }
        if (n.branches) rename(n.branches as typeof nodes);
      }
    };
    rename(doc.product_tree.branches);
    const result = await parseRhelCsaf([JSON.stringify([doc])], { major: '10' });
    expect(result.records).toEqual([]);
  });
});

describe('readJsonDocuments', () => {
  const collect = async (chunks: string[]): Promise<unknown[]> => {
    const docs: unknown[] = [];
    await readJsonDocuments(chunks, { onDocument: (doc) => docs.push(doc) });
    return docs;
  };

  it('splits documents across arbitrary chunk boundaries, including inside strings', async () => {
    const text = '[{"a":"x}\\"{y"},\n {"b":[{"c":1}]}]';
    const whole = await collect([text]);
    expect(whole).toEqual([{ a: 'x}"{y' }, { b: [{ c: 1 }] }]);
    for (let size = 1; size < 9; size++) {
      const chunks = text.match(new RegExp(`.{1,${size}}`, 'gs')) ?? [];
      expect(await collect(chunks)).toEqual(whole);
    }
  });

  it('handles multibyte characters split across byte chunks', async () => {
    const bytes = Buffer.from('[{"a":"żółć"}]');
    const docs: unknown[] = [];
    await readJsonDocuments(
      Array.from(bytes, (b) => Uint8Array.of(b)),
      { onDocument: (doc) => docs.push(doc) }
    );
    expect(docs).toEqual([{ a: 'żółć' }]);
  });

  it('rejects input that is not an array of objects', async () => {
    await expect(collect(['[1,2]'])).rejects.toThrow('not a JSON array of objects');
  });

  it('refuses a single document over the size cap', async () => {
    const chunk = `"${'a'.repeat(MAX_DOCUMENT_BYTES / 4)}`;
    const chunks = ['[{"k":', chunk, chunk, chunk, chunk, chunk];
    await expect(collect(chunks)).rejects.toThrow('over');
  });

  it('refuses a complete single-push document over the size cap', async () => {
    const doc = `[{"k":"${'a'.repeat(MAX_DOCUMENT_BYTES + 16)}"}]`;
    await expect(collect([doc])).rejects.toThrow('over');
  });
});

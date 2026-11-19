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

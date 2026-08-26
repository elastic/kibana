/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { stixAdapter } from './stix_adapter';
import { normalizedReportSchema } from '../../../../common/threat_intel/workflows/step_types/fetch_source/fetch_source_common';
import type { AdapterRunContext, SourceHit } from '../types';

const URL = 'https://stix.example/bundle.json';
const NOW = new Date('2026-05-16T12:00:00.000Z');

const buildSource = (): SourceHit => ({
  _id: 'stix:vendor',
  _source: {
    adapter_type: 'stix',
    name: 'Vendor STIX',
    config: { url: URL },
  },
});

const buildContext = (
  fetchImpl: jest.Mock<Promise<Response>, [string | URL | Request, RequestInit?]>
): AdapterRunContext => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  logger: loggingSystemMock.createLogger(),
  abortSignal: new AbortController().signal,
  now: () => NOW,
  fetchFn: fetchImpl as unknown as typeof fetch,
  lookupFn: async () => [{ address: '93.184.216.34' }],
});

const okJson = (value: unknown): Response =>
  new Response(JSON.stringify(value), {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/stix+json' },
  });

describe('stixAdapter', () => {
  it('emits one normalized report per reportable SDO', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--1',
        objects: [
          {
            type: 'indicator',
            id: 'indicator--1',
            name: 'IOC: bad domain',
            description: 'Detects connections to bad.example.',
            modified: '2026-05-15T00:00:00Z',
            pattern: "[domain-name:value = 'bad.example']",
            pattern_type: 'stix',
          },
          { type: 'marking-definition', id: 'marking-definition--1' },
          {
            type: 'threat-actor',
            id: 'threat-actor--1',
            name: 'APT-Test',
            description: 'A test actor.',
            created: '2026-05-10T00:00:00Z',
          },
        ],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({
      source: { type: 'stix', adapter_id: 'stix:stix:vendor', url: URL },
      content: { title: 'IOC: bad domain' },
      lineage: {
        // parseable stix pattern → structured at ingest; enrichment skips re-extraction
        extraction_method: 'stix',
        extracted_at: NOW.toISOString(),
        source_doc_ref: { index: 'stix:bundle', id: 'indicator--1' },
      },
    });
    expect(reports[0].extracted?.iocs).toHaveLength(1);
    expect(reports[0].extracted?.iocs![0]).toMatchObject({ type: 'domain', value: 'bad.example' });
    expect(reports[0].content.body_text).toContain(
      "Pattern (stix): [domain-name:value = 'bad.example']"
    );
    expect(reports[1].source.adapter_id).toBe('stix:stix:vendor');
    expect(reports[1].content.title).toBe('APT-Test');
  });

  it('throws on non-2xx', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response('nope', { status: 401, statusText: 'Unauthorized' }));
    await expect(stixAdapter.run(buildSource(), buildContext(fetchMock))).rejects.toThrow(
      /HTTP 401/
    );
  });

  it('throws on a non-JSON response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        new Response('<not json>', { status: 200, headers: { 'Content-Type': 'text/plain' } })
      );
    await expect(stixAdapter.run(buildSource(), buildContext(fetchMock))).rejects.toThrow(
      /not valid JSON/
    );
  });

  it('returns [] when the bundle has no reportable SDOs', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--empty',
        objects: [{ type: 'marking-definition', id: 'marking-definition--1' }],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toEqual([]);
  });

  it('indicator SDO with parseable pattern → extraction_method:stix, extracted_at set, extracted.iocs populated, body_text still present', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--2',
        objects: [
          {
            type: 'indicator',
            id: 'indicator--2',
            name: 'Malicious IP',
            description: 'Known C2 server.',
            modified: '2026-05-15T00:00:00Z',
            pattern: "[ipv4-addr:value = '1.2.3.4']",
            pattern_type: 'stix',
          },
        ],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toHaveLength(1);
    const [report] = reports;
    expect(report.lineage.extraction_method).toBe('stix');
    expect(report.lineage.extracted_at).toBe(NOW.toISOString());
    expect(report.extracted?.iocs).toHaveLength(1);
    expect(report.extracted?.iocs![0]).toMatchObject({
      type: 'ip',
      value: '1.2.3.4',
      tier: 'contextual',
    });
    expect(report.content.body_text).toContain('Known C2 server');
  });

  it('indicator SDO with unparseable pattern (yara dialect) → falls back to extraction_method:pending, no extracted', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--3',
        objects: [
          {
            type: 'indicator',
            id: 'indicator--3',
            name: 'YARA rule',
            description: 'Detects malware via YARA.',
            modified: '2026-05-15T00:00:00Z',
            pattern: 'rule malware { strings: $a = "bad" condition: $a }',
            pattern_type: 'yara',
          },
        ],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toHaveLength(1);
    const [report] = reports;
    expect(report.lineage.extraction_method).toBe('pending');
    expect(report.lineage.extracted_at).toBeUndefined();
    expect(report.extracted).toBeUndefined();
  });

  it('indicator SDO with IN-list pattern (no = literal) → falls back to pending', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--4',
        objects: [
          {
            type: 'indicator',
            id: 'indicator--4',
            name: 'IN list',
            description: 'Multiple IPs.',
            modified: '2026-05-15T00:00:00Z',
            pattern: "[ipv4-addr:value IN ('1.2.3.4', '5.6.7.8')]",
            pattern_type: 'stix',
          },
        ],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toHaveLength(1);
    const [report] = reports;
    expect(report.lineage.extraction_method).toBe('pending');
    expect(report.extracted).toBeUndefined();
  });

  it('indicator SDO with external_references → content.external_references structured and correct', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--5',
        objects: [
          {
            type: 'indicator',
            id: 'indicator--5',
            name: 'Ref indicator',
            description: 'Has references.',
            modified: '2026-05-15T00:00:00Z',
            pattern: "[domain-name:value = 'evil.example']",
            pattern_type: 'stix',
            external_references: [
              { source_name: 'mitre', external_id: 'T1234', url: 'https://attack.mitre.org/T1234' },
              { source_name: 'nvd', description: 'CVE notes' },
              { not_a_source_name: 'should be dropped' },
            ],
          },
        ],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toHaveLength(1);
    const refs = reports[0].content.external_references;
    expect(refs).toHaveLength(2);
    expect(refs![0]).toEqual({
      source_name: 'mitre',
      external_id: 'T1234',
      url: 'https://attack.mitre.org/T1234',
    });
    expect(refs![1]).toEqual({ source_name: 'nvd', description: 'CVE notes' });
  });

  it('non-indicator SDO (malware) → unchanged shape: pending, no extracted, no external_references', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--6',
        objects: [
          {
            type: 'malware',
            id: 'malware--1',
            name: 'BadBot',
            description: 'A RAT.',
            modified: '2026-05-15T00:00:00Z',
          },
        ],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toHaveLength(1);
    const [report] = reports;
    expect(report.lineage.extraction_method).toBe('pending');
    expect(report.lineage.extracted_at).toBeUndefined();
    expect(report.extracted).toBeUndefined();
    expect(report.content.external_references).toBeUndefined();
  });

  it('report without external_references → field absent on non-indicator SDO', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        type: 'bundle',
        id: 'bundle--7',
        objects: [
          {
            type: 'threat-actor',
            id: 'threat-actor--2',
            name: 'NoRefs',
            description: 'No external refs.',
            created: '2026-05-10T00:00:00Z',
          },
        ],
      })
    );
    const reports = await stixAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports[0].content.external_references).toBeUndefined();
  });

  it('normalizedReportSchema parses both a legacy pending report and a new stix report (back-compat)', () => {
    const pendingReport = {
      '@timestamp': '2026-05-16T12:00:00.000Z',
      content_fingerprint: 'abc123',
      space_id: '*',
      source: {
        type: 'stix' as const,
        name: 'Test',
        url: 'https://example.com',
        adapter_id: 'stix:test',
      },
      content: { title: 'Test', body_text: 'body', language: 'en' },
      severity: { level: 'low' as const, score: 1 },
      lineage: {
        ingested_at: '2026-05-16T12:00:00.000Z',
        extraction_method: 'pending' as const,
        source_doc_ref: { index: 'stix:bundle', id: 'indicator--1' },
      },
    };
    expect(() => normalizedReportSchema.parse(pendingReport)).not.toThrow();

    const stixReport = {
      ...pendingReport,
      lineage: {
        ingested_at: '2026-05-16T12:00:00.000Z',
        extraction_method: 'stix' as const,
        extracted_at: '2026-05-16T12:00:00.000Z',
        source_doc_ref: { index: 'stix:bundle', id: 'indicator--1' },
      },
      extracted: {
        iocs: [
          {
            type: 'ip',
            value: '1.2.3.4',
            tier: 'contextual',
            tier_heuristic: 'contextual',
            tier_basis: 'stix_pattern',
          },
        ],
      },
    };
    expect(() => normalizedReportSchema.parse(stixReport)).not.toThrow();
  });
});

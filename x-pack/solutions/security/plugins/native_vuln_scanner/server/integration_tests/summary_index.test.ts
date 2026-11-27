/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { SummaryDoc } from '../lib/summary';
import { summaryMappings } from '../lib/summary/mappings';
import { ensureSummaryIndex, SUMMARY_INDEX, writeSummary } from '../lib/summary';

const kibanaSystemClient = (esServer: TestElasticsearchUtils): Client => {
  const url = new URL(esServer.es.getHostUrls()[0]);
  url.username = '';
  url.password = '';
  return new Client({
    node: url.toString(),
    auth: { username: 'kibana_system', password: 'changeme' },
    Connection: HttpConnection,
    requestTimeout: 30_000,
  });
};

const doc = (runId: string): SummaryDoc => ({
  '@timestamp': '2026-11-13T10:05:00.000Z',
  run_id: runId,
  started_at: '2026-11-13T10:00:00.000Z',
  finished_at: '2026-11-13T10:05:00.000Z',
  status: 'partial',
  hosts_scanned: 3,
  findings_open: 12,
  findings_fixed: 2,
  feeds: [
    { release: 'ubuntu:noble', status: 'matched', etag: '"b31569-660243cd5d600"' },
    { release: 'rhel:9', status: 'failed', error: 'Advisory feed returned HTTP 503' },
  ],
  failures: ['rhel:9: Advisory feed returned HTTP 503'],
  knowledge: { written: 661, unchanged: 0, failed: 0, skipped_releases: ['ubuntu:noble'] },
});

describe('run summary index', () => {
  let esServer: TestElasticsearchUtils;
  let kibana: Client;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    kibana = kibanaSystemClient(esServer);
  });

  afterAll(async () => {
    await kibana?.close();
    await esServer?.stop();
  });

  it('is created and written with the privileges of kibana_system', async () => {
    expect((await kibana.security.authenticate()).username).toBe('kibana_system');
    // Negative control: a name outside `.kibana*` is refused, so the grant under test is real.
    await expect(
      kibana.indices.create({ index: 'logs-native_vuln_scanner-default' })
    ).rejects.toMatchObject({ meta: { statusCode: 403 } });

    await ensureSummaryIndex(kibana);
    await ensureSummaryIndex(kibana);
    await writeSummary(kibana, doc('run-1'));
    const rerun: SummaryDoc = { ...doc('run-1'), status: 'success', findings_open: 99 };
    await writeSummary(kibana, rerun);
    await writeSummary(kibana, doc('run-2'));

    const admin: Client = esServer.es.getClient();
    await admin.indices.refresh({ index: SUMMARY_INDEX, expand_wildcards: ['open', 'hidden'] });
    const { hits } = await admin.search<SummaryDoc>({
      index: SUMMARY_INDEX,
      expand_wildcards: ['open', 'hidden'],
      query: { match_all: {} },
    });
    expect(hits.hits.map(({ _id }) => _id).sort()).toEqual(['run-1', 'run-2']);
    expect(hits.hits.find(({ _id }) => _id === 'run-1')?._source).toEqual(rerun);
  });

  it('adds the knowledge counters to an index created before they existed', async () => {
    const admin: Client = esServer.es.getClient();
    const { properties } = summaryMappings;
    const { knowledge: _omitted, ...legacyProperties } = properties ?? {};
    await admin.indices.delete({ index: SUMMARY_INDEX });
    await admin.indices.create({
      index: SUMMARY_INDEX,
      settings: { hidden: true },
      mappings: { ...summaryMappings, properties: legacyProperties },
    });
    const { knowledge, ...withoutKnowledge } = doc('run-legacy');
    await expect(
      kibana.index({ index: SUMMARY_INDEX, document: doc('run-legacy') })
    ).rejects.toMatchObject({ meta: { statusCode: 400 } });

    await ensureSummaryIndex(kibana);
    await writeSummary(kibana, { ...withoutKnowledge, knowledge });
    const found = await admin.get<SummaryDoc>({ index: SUMMARY_INDEX, id: 'run-legacy' });
    expect(found._source?.knowledge).toEqual(knowledge);
  });

  it('rejects a field the mapping does not know', async () => {
    await ensureSummaryIndex(kibana);
    await expect(
      kibana.index({ index: SUMMARY_INDEX, document: { ...doc('run-3'), surprise: true } })
    ).rejects.toMatchObject({ meta: { statusCode: 400 } });
  });
});

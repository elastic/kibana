/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ingestReport } from './ingest_report';

const logger = loggingSystemMock.createLogger();

const buildEsClient = ({ totalHits = 0 }: { totalHits?: number } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockResolvedValue({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: totalHits, relation: 'eq' as const },
      max_score: null,
      hits: totalHits > 0 ? [{ _id: 'existing-id', _index: '.kibana-threat-reports' }] : [],
    },
  } as ReturnType<typeof esClient.search> extends Promise<infer T> ? T : never);
  esClient.index.mockResolvedValue({
    _id: 'new-report-id',
    _index: '.kibana-threat-reports',
    result: 'created',
    _shards: { total: 1, successful: 1, failed: 0 },
    _seq_no: 0,
    _primary_term: 1,
  } as ReturnType<typeof esClient.index> extends Promise<infer T> ? T : never);
  return esClient;
};

const BASE_PARAMS = {
  title: 'Test report',
  body_text: 'The threat actor contacted evil.com',
  source_name: 'Test Vendor',
  source_url: 'https://example.com/report',
} as const;

describe('ingestReport', () => {
  it('returns ingested status and report_id on new report', async () => {
    const esClient = buildEsClient();
    const result = await ingestReport(esClient, logger, 'default', BASE_PARAMS);
    expect(result.status).toBe('ingested');
    expect(result.report_id).toBe('new-report-id');
    expect(esClient.index).toHaveBeenCalledTimes(1);
  });

  it('returns duplicate status when content fingerprint already exists', async () => {
    const esClient = buildEsClient({ totalHits: 1 });
    const result = await ingestReport(esClient, logger, 'default', BASE_PARAMS);
    expect(result.status).toBe('duplicate');
    expect(result.report_id).toBe('existing-id');
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('stores content.body_html when body_html is provided', async () => {
    const esClient = buildEsClient();
    const html = '<h2>IOCs</h2><ul><li>evil.com</li></ul>';
    await ingestReport(esClient, logger, 'default', { ...BASE_PARAMS, body_html: html });

    const indexCall = esClient.index.mock.calls[0][0];
    const doc = indexCall.document as Record<string, unknown>;
    const content = doc.content as Record<string, unknown>;
    expect(content.body_html).toBe(html);
    // body_text remains the clean fallback
    expect(content.body_text).toBe(BASE_PARAMS.body_text);
  });

  it('does not include body_html in content when body_html is absent', async () => {
    const esClient = buildEsClient();
    await ingestReport(esClient, logger, 'default', BASE_PARAMS);

    const indexCall = esClient.index.mock.calls[0][0];
    const doc = indexCall.document as Record<string, unknown>;
    const content = doc.content as Record<string, unknown>;
    expect(content).not.toHaveProperty('body_html');
  });
});

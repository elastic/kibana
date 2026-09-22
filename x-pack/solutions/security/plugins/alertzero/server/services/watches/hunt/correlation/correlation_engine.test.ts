/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { huntCorrelationAttachmentDataSchema } from '../../../../../common/hunt_correlation_attachment_schema';
import { runCorrelationEngine } from './correlation_engine';

const logger = loggingSystemMock.createLogger();

const emptySearchResponse: SearchResponse<unknown, unknown> = {
  took: 0,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits: [], total: { value: 0, relation: 'eq' as const } },
};

const hashIoc = (n: number) => ({
  type: 'hash' as const,
  value: `${n.toString(16).padStart(8, '0')}${'0'.repeat(56)}`,
});

const run = (params: Parameters<typeof runCorrelationEngine>[3], revision?: string) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockResolvedValue(emptySearchResponse);
  return runCorrelationEngine(esClient, logger, 'hunt-a', params, revision);
};

describe('runCorrelationEngine with only a source_report_id', () => {
  const sourceHit = {
    took: 0,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: 1, relation: 'eq' as const },
      hits: [
        {
          _index: '.kibana-threat-reports',
          _id: 'rpt-1',
          _source: {
            extracted: {
              iocs: [{ type: 'hash', value: 'a'.repeat(64) }],
              ioc_set_hash: null,
              threat_actors: ['TA-DEMO-SHADOW-ADMIN'],
              ttps: { techniques: ['T1078.004'] },
            },
          },
        },
      ],
    },
  } as unknown as SearchResponse<unknown, unknown>;

  it("builds the attachment anchors from the source report's own anchors", async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce(sourceHit).mockResolvedValueOnce(emptySearchResponse);
    const result = await runCorrelationEngine(esClient, logger, 'hunt-a', {
      source_report_id: 'rpt-1',
    });
    expect(result.attachment_data.anchors).toEqual([
      { kind: 'hash', value: 'a'.repeat(64) },
      { kind: 'actor', value: 'TA-DEMO-SHADOW-ADMIN' },
    ]);
  });

  it("reports the source report's anchors on the engine result too", async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce(sourceHit).mockResolvedValueOnce(emptySearchResponse);
    const result = await runCorrelationEngine(esClient, logger, 'hunt-a', {
      source_report_id: 'rpt-1',
    });
    expect(result.anchors.actors).toEqual(['TA-DEMO-SHADOW-ADMIN']);
  });
});

describe('runCorrelationEngine attachment_data', () => {
  it('parses against the security.hunt_correlation attachment schema', async () => {
    const result = await run({ source_report_id: 'rpt-1', anchors: { actors: ['APT29'] } });
    expect(huntCorrelationAttachmentDataSchema.safeParse(result.attachment_data).success).toBe(
      true
    );
  });

  it('still parses when the search is unavailable', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockRejectedValue(new Error('cluster away'));
    const result = await runCorrelationEngine(esClient, logger, 'hunt-a', {
      source_report_id: 'rpt-1',
      anchors: { actors: ['APT29'] },
    });
    expect(huntCorrelationAttachmentDataSchema.safeParse(result.attachment_data).success).toBe(
      true
    );
  });

  it('omits report_revision when none is known instead of writing an empty string', async () => {
    const result = await run({ source_report_id: 'rpt-1', anchors: { actors: ['APT29'] } });
    expect(result.attachment_data).not.toHaveProperty('report_revision');
  });

  it('carries a known report_revision through', async () => {
    const result = await run(
      { source_report_id: 'rpt-1', anchors: { actors: ['APT29'] } },
      'rev-7'
    );
    expect(result.attachment_data.report_revision).toBe('rev-7');
  });

  it('caps anchors at the 50 the attachment schema allows', async () => {
    const iocs = Array.from({ length: 60 }, (_, i) => hashIoc(i));
    const result = await run({ source_report_id: 'rpt-1', anchors: { iocs } });
    expect(result.attachment_data.anchors).toHaveLength(50);
  });

  it('derives the same attachment id for the same space and report', async () => {
    const first = await run({ source_report_id: 'rpt-1', anchors: { actors: ['APT29'] } });
    const second = await run({ source_report_id: 'rpt-1', anchors: { actors: ['APT29'] } });
    expect(first.attachment_data.attachment_id).toBe(second.attachment_data.attachment_id);
  });
});

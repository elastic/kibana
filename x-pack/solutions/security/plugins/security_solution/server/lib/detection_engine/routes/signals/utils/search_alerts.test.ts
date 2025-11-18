/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { searchAlerts } from './search_alerts';
import type { QueryAlertsBodyParams } from '../../../../../../common/api/detection_engine/signals';

describe('searchAlerts', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('calls esClient.search with the correct parameters', async () => {
    const queryParams: QueryAlertsBodyParams = {
      query: { bool: { must: [{ term: { 'kibana.alert.workflow_status': 'open' } }] } },
      aggs: {
        alerts_by_status: {
          terms: {
            field: 'kibana.alert.workflow_status',
          },
        },
      },
      _source: ['kibana.alert.uuid'],
      fields: ['kibana.alert.rule.name'],
      track_total_hits: true,
      size: 10,
      runtime_mappings: {
        'event.kind': {
          type: 'keyword',
          script: "emit(doc['event.kind'].value)",
        },
      },
      sort: [{ '@timestamp': 'desc' }],
    };
    const indexPattern = 'my-index';

    await searchAlerts({ queryParams, esClient: mockEsClient, indexPattern });

    expect(mockEsClient.search).toHaveBeenCalledWith({
      index: indexPattern,
      query: queryParams.query,
      aggs: queryParams.aggs,
      _source: queryParams._source,
      fields: queryParams.fields,
      track_total_hits: queryParams.track_total_hits,
      size: queryParams.size,
      runtime_mappings: queryParams.runtime_mappings,
      sort: queryParams.sort,
      ignore_unavailable: true,
    });
  });

  it('handles optional parameters correctly', async () => {
    const queryParams: QueryAlertsBodyParams = {
      query: { term: { 'event.kind': 'alert' } },
      size: 0,
    };
    const indexPattern = ['index-1', 'index-2'];

    await searchAlerts({ queryParams, esClient: mockEsClient, indexPattern });

    expect(mockEsClient.search).toHaveBeenCalledWith({
      index: indexPattern,
      query: queryParams.query,
      aggs: undefined,
      _source: undefined,
      fields: undefined,
      track_total_hits: undefined,
      size: queryParams.size,
      runtime_mappings: undefined,
      sort: undefined,
      ignore_unavailable: true,
    });
  });

  it('uses default index pattern when none is provided', async () => {
    const queryParams: QueryAlertsBodyParams = {
      query: { match_all: {} },
      size: 1,
    };

    await searchAlerts({ queryParams, esClient: mockEsClient });

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: undefined,
      })
    );
  });
});

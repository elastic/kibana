/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { mockAnonymizationFields } from '../../../mock/mock_anonymization_fields';
import { getAnonymizedEvents } from './get_anonymized_events';
import { mockAnonymizedEvents } from '../../../mock/mock_anonymized_events';
import { AnonymizedEventsRetriever } from '.';

jest.mock('./get_anonymized_events', () => ({
  getAnonymizedEvents: jest.fn(),
}));

describe('AnonymizedEventsRetriever', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();

    esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

    (getAnonymizedEvents as jest.Mock).mockResolvedValue([...mockAnonymizedEvents]);
  });

  it('returns the expected pageContent and metadata', async () => {
    const retriever = new AnonymizedEventsRetriever({
      insightType: 'incompatible_antivirus' as DefendInsightType,
      endpointIds: ['endpoint-1'],
      anonymizationFields: mockAnonymizationFields,
      esClient,
      size: 10,
    });

    const documents = await retriever._getRelevantDocuments('test-query');

    expect(documents).toEqual([
      {
        pageContent: mockAnonymizedEvents[0],
        metadata: {},
      },
      {
        pageContent: mockAnonymizedEvents[1],
        metadata: {},
      },
    ]);
  });

  it('calls getAnonymizedEvents with the expected parameters', async () => {
    const onNewReplacements = jest.fn();
    const mockReplacements = {
      replacement1: 'SRVMAC08',
      replacement2: 'SRVWIN01',
      replacement3: 'SRVWIN02',
    };

    const retriever = new AnonymizedEventsRetriever({
      insightType: 'incompatible_antivirus' as DefendInsightType,
      endpointIds: ['endpoint-1'],
      anonymizationFields: mockAnonymizationFields,
      esClient,
      onNewReplacements,
      replacements: mockReplacements,
      size: 10,
    });

    await retriever._getRelevantDocuments('test-query');

    expect(getAnonymizedEvents).toHaveBeenCalledWith({
      insightType: 'incompatible_antivirus',
      endpointIds: ['endpoint-1'],
      anonymizationFields: mockAnonymizationFields,
      esClient,
      onNewReplacements,
      replacements: mockReplacements,
      size: 10,
    });
  });

  it('handles empty anonymized events', async () => {
    (getAnonymizedEvents as jest.Mock).mockResolvedValue([]);

    const retriever = new AnonymizedEventsRetriever({
      insightType: 'incompatible_antivirus' as DefendInsightType,
      endpointIds: ['endpoint-1'],
      anonymizationFields: mockAnonymizationFields,
      esClient,
      size: 10,
    });

    const documents = await retriever._getRelevantDocuments('test-query');

    expect(documents).toHaveLength(0);
  });
});

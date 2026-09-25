/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import type { SignificantEventsPluginStartDependencies } from '../../types';
import { knowledgeIndicatorsDataStream } from './data_stream';
import { KnowledgeIndicatorClient } from './knowledge_indicator_client';
import { KnowledgeIndicatorService } from './knowledge_indicator_service';
import type { SignificantEventsAlertingContext } from '../significant_events/alerting/significant_events_alerting_context';

jest.mock('@kbn/data-streams', () => ({
  DataStreamClient: { fromDefinition: jest.fn(() => ({ __dataStreamClient: true })) },
}));

jest.mock('./knowledge_indicator_client', () => ({
  KnowledgeIndicatorClient: jest.fn(),
}));

jest.mock('../feature_flags/is_significant_events_feature_flag_enabled', () => ({
  isSignificantEventsFeatureFlagEnabled: jest.fn(async () => true),
}));

const fromDefinitionMock = DataStreamClient.fromDefinition as jest.Mock;
const KnowledgeIndicatorClientMock = KnowledgeIndicatorClient as unknown as jest.Mock;

describe('KnowledgeIndicatorService', () => {
  beforeEach(() => jest.clearAllMocks());

  const initializeClient = jest.fn(async () => ({}));

  const buildService = () => {
    const logger = { get: jest.fn(() => ({} as Logger)) } as unknown as Logger;
    const coreSetup = {
      getStartServices: jest.fn(async () => [
        { featureFlags: {}, dataStreams: { initializeClient } },
      ]),
    } as unknown as CoreSetup<SignificantEventsPluginStartDependencies>;
    return new KnowledgeIndicatorService(coreSetup, logger);
  };

  it('ensures core initializes the data stream, then binds reads and writes to the caller esClient', async () => {
    const service = buildService();
    const esClient = { id: 'current-user' } as unknown as ElasticsearchClient;
    const soClient = {} as any;
    const context = { rulesClient: {} } as unknown as SignificantEventsAlertingContext;

    await service.getClient({ esClient, soClient, context });

    expect(initializeClient).toHaveBeenCalledWith(knowledgeIndicatorsDataStream.name);
    expect(fromDefinitionMock).toHaveBeenCalledWith({
      dataStream: knowledgeIndicatorsDataStream,
      elasticsearchClient: esClient,
    });

    const [deps] = KnowledgeIndicatorClientMock.mock.calls[0];
    expect(deps.esClient).toBe(esClient);
    expect(deps.dataStreamClient).toEqual({ __dataStreamClient: true });
    expect(deps.soClient).toBe(soClient);
  });
});

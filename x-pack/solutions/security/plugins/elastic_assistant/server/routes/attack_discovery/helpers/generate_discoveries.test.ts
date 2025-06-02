/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { AttackDiscoveryGenerationConfig } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { generateAttackDiscoveries } from './generate_discoveries';
import { invokeAttackDiscoveryGraph } from '../post/helpers/invoke_attack_discovery_graph';
import { mockAnonymizedAlerts } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_attack_discoveries';

jest.mock('../post/helpers/invoke_attack_discovery_graph', () => ({
  ...jest.requireActual('../post/helpers/invoke_attack_discovery_graph'),
  invokeAttackDiscoveryGraph: jest.fn(),
}));

const mockActionsClient = actionsClientMock.create();
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();
const mockSavedObjectsClient = savedObjectsClientMock.create();

const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  provider: OpenAiProviderType.OpenAi,
};

const mockConfig: AttackDiscoveryGenerationConfig = {
  subAction: 'invokeAI',
  apiConfig: mockApiConfig,
  alertsIndexPattern: 'alerts-*',
  anonymizationFields: [],
  replacements: {},
  model: 'gpt-4',
  size: 20,
  langSmithProject: 'langSmithProject',
  langSmithApiKey: 'langSmithApiKey',
};

describe('generateAttackDiscoveries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (invokeAttackDiscoveryGraph as jest.Mock).mockResolvedValue({
      anonymizedAlerts: mockAnonymizedAlerts,
      attackDiscoveries: mockAttackDiscoveries,
    });
  });

  it('should call `invokeAttackDiscoveryGraph`', async () => {
    await generateAttackDiscoveries({
      actionsClient: mockActionsClient,
      config: mockConfig,
      esClient: mockEsClient,
      logger: mockLogger,
      savedObjectsClient: mockSavedObjectsClient,
    });

    expect(invokeAttackDiscoveryGraph).toHaveBeenCalledWith({
      actionsClient: mockActionsClient,
      alertsIndexPattern: mockConfig.alertsIndexPattern,
      anonymizationFields: mockConfig.anonymizationFields,
      apiConfig: mockConfig.apiConfig,
      connectorTimeout: 580000,
      end: mockConfig.end,
      esClient: mockEsClient,
      filter: mockConfig.filter,
      langSmithProject: mockConfig.langSmithProject,
      langSmithApiKey: mockConfig.langSmithApiKey,
      latestReplacements: mockConfig.replacements,
      logger: mockLogger,
      onNewReplacements: expect.anything(),
      savedObjectsClient: mockSavedObjectsClient,
      size: mockConfig.size,
      start: mockConfig.start,
    });
  });

  it('should return valid results', async () => {
    const results = await generateAttackDiscoveries({
      actionsClient: mockActionsClient,
      config: mockConfig,
      esClient: mockEsClient,
      logger: mockLogger,
      savedObjectsClient: mockSavedObjectsClient,
    });

    expect(results).toEqual({
      anonymizedAlerts: mockAnonymizedAlerts,
      attackDiscoveries: mockAttackDiscoveries,
      replacements: mockConfig.replacements,
    });
  });
});

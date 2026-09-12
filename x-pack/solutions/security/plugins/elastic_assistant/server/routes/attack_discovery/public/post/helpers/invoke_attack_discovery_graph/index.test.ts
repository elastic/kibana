/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invokeAttackDiscoveryGraph } from '.';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiConfig } from '@kbn/elastic-assistant-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { InferenceClient } from '@kbn/inference-common';
import { ActionsClientLlm, InferenceClientLlm } from '@kbn/langchain/server';
import { getDefaultAttackDiscoveryGraph } from '../../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph';
import { getAttackDiscoveryPrompts } from '../../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/prompts';
import { throwIfErrorCountsExceeded } from '../throw_if_error_counts_exceeded';
import { throwIfInvalidAnonymization } from '../throw_if_invalid_anonymization';

jest.mock('@kbn/langchain/server', () => ({
  ActionsClientLlm: jest.fn(),
  InferenceClientLlm: jest.fn(),
  getLangSmithTracer: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph', () => ({
  getDefaultAttackDiscoveryGraph: jest.fn(),
}));

jest.mock(
  '../../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/prompts',
  () => ({
    getAttackDiscoveryPrompts: jest.fn().mockResolvedValue({}),
  })
);

jest.mock('../throw_if_error_counts_exceeded', () => ({
  throwIfErrorCountsExceeded: jest.fn(),
}));

jest.mock('../throw_if_invalid_anonymization', () => ({
  throwIfInvalidAnonymization: jest.fn(),
}));

describe('invokeAttackDiscoveryGraph', () => {
  let actionsClient: PublicMethodsOf<ActionsClient>;
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let savedObjectsClient: SavedObjectsClientContract;
  let mockGraphInvoke: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    actionsClient = {} as PublicMethodsOf<ActionsClient>;
    esClient = {} as ElasticsearchClient;
    logger = { debug: jest.fn() } as unknown as Logger;
    savedObjectsClient = {} as SavedObjectsClientContract;

    mockGraphInvoke = jest.fn().mockResolvedValue({
      insights: [{ title: 'Test Insight' }],
      anonymizedDocuments: [{ pageContent: 'Test Doc' }],
      errors: [],
      generationAttempts: 1,
      hallucinationFailures: 0,
      maxGenerationAttempts: 3,
      maxHallucinationFailures: 3,
    });

    (getDefaultAttackDiscoveryGraph as jest.Mock).mockReturnValue({
      invoke: mockGraphInvoke,
    });
  });
  it('throws an error if inferenceClient is missing for an inference endpoint connector', async () => {
    const apiConfig: ApiConfig = {
      actionTypeId: '.inference',
      connectorId: 'my-connector',
    };

    await expect(
      invokeAttackDiscoveryGraph({
        actionsClient,
        alertsIndexPattern: 'alerts-*',
        anonymizationFields: [{ id: 'mock-id', field: '_id', allowed: true }],
        apiConfig,
        connectorTimeout: 30000,
        esClient,
        latestReplacements: {},
        logger,
        onNewReplacements: jest.fn(),
        savedObjectsClient,
        size: 10,
      })
    ).rejects.toThrow(
      'inferenceClient is required for connector "my-connector" (actionTypeId: .inference) but was not provided'
    );
  });

  it('instantiates ActionsClientLlm and invokes the graph for a legacy connector', async () => {
    const apiConfig: ApiConfig = {
      actionTypeId: '.bedrock',
      connectorId: 'legacy-connector',
    };

    const result = await invokeAttackDiscoveryGraph({
      actionsClient,
      alertsIndexPattern: 'alerts-*',
      anonymizationFields: [{ id: 'mock-id', field: '_id', allowed: true }],
      apiConfig,
      connectorTimeout: 30000,
      esClient,
      latestReplacements: {},
      logger,
      onNewReplacements: jest.fn(),
      savedObjectsClient,
      size: 10,
    });

    expect(throwIfInvalidAnonymization).toHaveBeenCalled();
    expect(ActionsClientLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'legacy-connector',
        timeout: 30000,
      })
    );
    expect(InferenceClientLlm).not.toHaveBeenCalled();
    expect(getAttackDiscoveryPrompts).toHaveBeenCalled();
    expect(getDefaultAttackDiscoveryGraph).toHaveBeenCalled();
    expect(mockGraphInvoke).toHaveBeenCalled();
    expect(throwIfErrorCountsExceeded).toHaveBeenCalled();

    expect(result).toEqual({
      anonymizedAlerts: [{ pageContent: 'Test Doc' }],
      attackDiscoveries: [{ title: 'Test Insight' }],
    });
  });

  it('instantiates InferenceClientLlm and invokes the graph for an inference connector', async () => {
    const apiConfig: ApiConfig = {
      actionTypeId: '.inference',
      connectorId: 'inference-connector',
    };
    const inferenceClient = {} as InferenceClient;

    const result = await invokeAttackDiscoveryGraph({
      actionsClient,
      alertsIndexPattern: 'alerts-*',
      anonymizationFields: [{ id: 'mock-id', field: '_id', allowed: true }],
      apiConfig,
      connectorTimeout: 30000,
      esClient,
      inferenceClient,
      latestReplacements: {},
      logger,
      onNewReplacements: jest.fn(),
      savedObjectsClient,
      size: 10,
    });

    expect(throwIfInvalidAnonymization).toHaveBeenCalled();
    expect(InferenceClientLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'inference-connector',
        inferenceClient,
        timeout: 30000,
      })
    );
    expect(ActionsClientLlm).not.toHaveBeenCalled();
    expect(getAttackDiscoveryPrompts).toHaveBeenCalled();
    expect(getDefaultAttackDiscoveryGraph).toHaveBeenCalled();
    expect(mockGraphInvoke).toHaveBeenCalled();
    expect(throwIfErrorCountsExceeded).toHaveBeenCalled();

    expect(result).toEqual({
      anonymizedAlerts: [{ pageContent: 'Test Doc' }],
      attackDiscoveries: [{ title: 'Test Insight' }],
    });
  });

  it('throws if throwIfErrorCountsExceeded throws', async () => {
    const apiConfig: ApiConfig = {
      actionTypeId: '.bedrock',
      connectorId: 'legacy-connector',
    };

    (throwIfErrorCountsExceeded as jest.Mock).mockImplementation(() => {
      throw new Error('Error counts exceeded');
    });

    await expect(
      invokeAttackDiscoveryGraph({
        actionsClient,
        alertsIndexPattern: 'alerts-*',
        anonymizationFields: [{ id: 'mock-id', field: '_id', allowed: true }],
        apiConfig,
        connectorTimeout: 30000,
        esClient,
        latestReplacements: {},
        logger,
        onNewReplacements: jest.fn(),
        savedObjectsClient,
        size: 10,
      })
    ).rejects.toThrow('Error counts exceeded');
  });
});

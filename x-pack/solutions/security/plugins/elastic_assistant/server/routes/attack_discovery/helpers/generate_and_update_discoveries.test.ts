/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import { coreMock, elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { AttackDiscoveryGenerationConfig } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { generateAttackDiscoveries } from './generate_discoveries';
import { generateAndUpdateAttackDiscoveries } from './generate_and_update_discoveries';
import { updateAttackDiscoveries } from './helpers';
import { handleGraphError } from '../post/helpers/handle_graph_error';
import { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { mockAnonymizedAlerts } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_attack_discoveries';

jest.mock('./generate_discoveries', () => ({
  ...jest.requireActual('./generate_discoveries'),
  generateAttackDiscoveries: jest.fn(),
}));
jest.mock('./helpers', () => ({
  ...jest.requireActual('./helpers'),
  updateAttackDiscoveries: jest.fn(),
}));
jest.mock('../post/helpers/handle_graph_error', () => ({
  ...jest.requireActual('../post/helpers/handle_graph_error'),
  handleGraphError: jest.fn(),
}));

const findAttackDiscoveryByConnectorId = jest.fn();
const updateAttackDiscovery = jest.fn();
const createAttackDiscovery = jest.fn();
const getAttackDiscovery = jest.fn();
const findAllAttackDiscoveries = jest.fn();
const mockDataClient = {
  findAttackDiscoveryByConnectorId,
  updateAttackDiscovery,
  createAttackDiscovery,
  getAttackDiscovery,
  findAllAttackDiscoveries,
} as unknown as AttackDiscoveryDataClient;

const mockActionsClient = actionsClientMock.create();
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();
const mockSavedObjectsClient = savedObjectsClientMock.create();
const mockTelemetry = coreMock.createSetup().analytics;

const mockAuthenticatedUser = {
  username: 'user',
  profile_uid: '1234',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

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

describe('generateAndUpdateAttackDiscoveries', () => {
  const testInvokeError = new Error('Failed to invoke AD graph.');
  const testUpdateError = new Error('Failed to update attack discoveries.');

  beforeEach(() => {
    jest.clearAllMocks();
    (generateAttackDiscoveries as jest.Mock).mockResolvedValue({
      anonymizedAlerts: mockAnonymizedAlerts,
      attackDiscoveries: mockAttackDiscoveries,
      replacements: mockConfig.replacements,
    });
  });

  describe('when passed valid arguments', () => {
    it('should call `generateAttackDiscoveries`', async () => {
      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(generateAttackDiscoveries).toHaveBeenCalledWith({
        actionsClient: mockActionsClient,
        config: mockConfig,
        esClient: mockEsClient,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
      });
    });

    it('should call `updateAttackDiscoveries`', async () => {
      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(updateAttackDiscoveries).toHaveBeenCalledWith(
        expect.objectContaining({
          anonymizedAlerts: mockAnonymizedAlerts,
          apiConfig: mockConfig.apiConfig,
          attackDiscoveries: mockAttackDiscoveries,
          executionUuid,
          authenticatedUser: mockAuthenticatedUser,
          dataClient: mockDataClient,
          hasFilter: false,
          end: mockConfig.end,
          latestReplacements: mockConfig.replacements,
          logger: mockLogger,
          size: mockConfig.size,
          start: mockConfig.start,
          telemetry: mockTelemetry,
        })
      );
    });

    it('should not call `handleGraphError`', async () => {
      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(handleGraphError).not.toBeCalled();
    });

    it('should return valid results', async () => {
      const executionUuid = 'test-1';
      const results = await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(results).toEqual({
        anonymizedAlerts: mockAnonymizedAlerts,
        attackDiscoveries: mockAttackDiscoveries,
        replacements: mockConfig.replacements,
      });
    });
  });

  describe('when `generateAttackDiscoveries` throws an error', () => {
    it('should call `handleGraphError`', async () => {
      (generateAttackDiscoveries as jest.Mock).mockRejectedValue(testInvokeError);

      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(handleGraphError).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: mockConfig.apiConfig,
          executionUuid,
          authenticatedUser: mockAuthenticatedUser,
          dataClient: mockDataClient,
          err: testInvokeError,
          latestReplacements: mockConfig.replacements,
          logger: mockLogger,
          telemetry: mockTelemetry,
        })
      );
    });

    it('should not call `updateAttackDiscoveries`', async () => {
      (generateAttackDiscoveries as jest.Mock).mockRejectedValue(testInvokeError);

      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(updateAttackDiscoveries).not.toBeCalled();
    });

    it('should return an error', async () => {
      (generateAttackDiscoveries as jest.Mock).mockRejectedValue(testInvokeError);

      const executionUuid = 'test-1';
      const results = await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(results).toEqual({ error: testInvokeError });
    });
  });

  describe('when `updateAttackDiscoveries` throws an error', () => {
    it('should call `generateAttackDiscoveries`', async () => {
      (updateAttackDiscoveries as jest.Mock).mockRejectedValue(testUpdateError);

      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(generateAttackDiscoveries).toHaveBeenCalledWith({
        actionsClient: mockActionsClient,
        config: mockConfig,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        esClient: mockEsClient,
      });
    });

    it('should call `handleGraphError`', async () => {
      (updateAttackDiscoveries as jest.Mock).mockRejectedValue(testUpdateError);

      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(handleGraphError).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: mockConfig.apiConfig,
          executionUuid,
          authenticatedUser: mockAuthenticatedUser,
          dataClient: mockDataClient,
          err: testUpdateError,
          latestReplacements: mockConfig.replacements,
          logger: mockLogger,
          telemetry: mockTelemetry,
        })
      );
    });

    it('should return an error', async () => {
      (updateAttackDiscoveries as jest.Mock).mockRejectedValue(testUpdateError);

      const executionUuid = 'test-1';
      const results = await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
      });

      expect(results).toEqual({ error: testUpdateError });
    });
  });
});

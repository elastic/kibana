/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { coreMock, elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { AttackDiscoveryGenerationConfig } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { mockAnonymizedAlerts } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_attack_discoveries';
import { generateAttackDiscoveries } from './generate_discoveries';
import { generateAndUpdateAttackDiscoveries } from './generate_and_update_discoveries';
import { reportAttackDiscoverySuccessTelemetry } from './report_attack_discovery_success_telemetry';
import type { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { handleGraphError } from '../public/post/helpers/handle_graph_error';
import { reportAttackDiscoveryGenerationSuccess } from './telemetry';

jest.mock('./generate_discoveries', () => ({
  ...jest.requireActual('./generate_discoveries'),
  generateAttackDiscoveries: jest.fn(),
}));
jest.mock('./report_attack_discovery_success_telemetry', () => ({
  ...jest.requireActual('./report_attack_discovery_success_telemetry'),
  reportAttackDiscoverySuccessTelemetry: jest.fn(),
}));
jest.mock('../../../lib/attack_discovery/persistence/deduplication', () => ({
  deduplicateAttackDiscoveries: jest
    .fn()
    .mockResolvedValue(
      jest.requireActual(
        '../../../lib/attack_discovery/evaluation/__mocks__/mock_attack_discoveries'
      ).mockAttackDiscoveries
    ),
}));
jest.mock('../public/post/helpers/handle_graph_error', () => ({
  ...jest.requireActual('../public/post/helpers/handle_graph_error'),
  handleGraphError: jest.fn(),
}));
jest.mock('./telemetry', () => {
  const actual = jest.requireActual('./telemetry');
  return {
    ...actual,
    reportAttackDiscoveryGenerationSuccess: jest.fn(actual.reportAttackDiscoveryGenerationSuccess),
  };
});

const createAttackDiscoveryAlerts = jest.fn();
const getAdHocAlertsIndexPattern = jest.fn();
const mockDataClient = {
  createAttackDiscoveryAlerts,
  getAdHocAlertsIndexPattern,
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
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
      });

      expect(generateAttackDiscoveries).toHaveBeenCalledWith({
        actionsClient: mockActionsClient,
        config: mockConfig,
        esClient: mockEsClient,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
      });
    });

    it('should call `reportAttackDiscoverySuccessTelemetry` with the expected telemetry', async () => {
      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
      });

      expect(reportAttackDiscoverySuccessTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          anonymizedAlerts: mockAnonymizedAlerts,
          apiConfig: mockConfig.apiConfig,
          attackDiscoveries: mockAttackDiscoveries,
          hasFilter: false,
          end: mockConfig.end,
          latestReplacements: mockConfig.replacements,
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
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
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
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
      });

      expect(results).toEqual({
        anonymizedAlerts: mockAnonymizedAlerts,
        attackDiscoveries: mockAttackDiscoveries,
        replacements: mockConfig.replacements,
      });
    });

    it.each([[true], [false]])(
      'should call createAttackDiscoveryAlerts with withReplacements=%s',
      async (withReplacementsVal) => {
        const executionUuid = 'test-1';

        await generateAndUpdateAttackDiscoveries({
          actionsClient: mockActionsClient,
          authenticatedUser: mockAuthenticatedUser,
          config: mockConfig,
          dataClient: mockDataClient,
          enableFieldRendering: true,
          esClient: mockEsClient,
          executionUuid,
          logger: mockLogger,
          savedObjectsClient: mockSavedObjectsClient,
          telemetry: mockTelemetry,
          withReplacements: withReplacementsVal,
        });

        expect(createAttackDiscoveryAlerts).toHaveBeenCalledWith(
          expect.objectContaining({
            createAttackDiscoveryAlertsParams: expect.objectContaining({
              withReplacements: withReplacementsVal,
            }),
          })
        );
      }
    );

    it.each([[true], [false]])(
      'should call createAttackDiscoveryAlerts with enableFieldRendering=%s',
      async (enableFieldRenderingVal) => {
        const executionUuid = 'test-2';

        await generateAndUpdateAttackDiscoveries({
          actionsClient: mockActionsClient,
          authenticatedUser: mockAuthenticatedUser,
          config: mockConfig,
          dataClient: mockDataClient,
          enableFieldRendering: enableFieldRenderingVal,
          esClient: mockEsClient,
          executionUuid,
          logger: mockLogger,
          savedObjectsClient: mockSavedObjectsClient,
          telemetry: mockTelemetry,
          withReplacements: false,
        });

        expect(createAttackDiscoveryAlerts).toHaveBeenCalledWith(
          expect.objectContaining({
            createAttackDiscoveryAlertsParams: expect.objectContaining({
              enableFieldRendering: enableFieldRenderingVal,
            }),
          })
        );
      }
    );
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
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
      });

      expect(handleGraphError).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: mockConfig.apiConfig,
          err: testInvokeError,
          logger: mockLogger,
          telemetry: mockTelemetry,
        })
      );
    });

    it('should not call `reportAttackDiscoverySuccessTelemetry`', async () => {
      (generateAttackDiscoveries as jest.Mock).mockRejectedValue(testInvokeError);

      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
      });

      expect(reportAttackDiscoverySuccessTelemetry).not.toBeCalled();
    });

    it('should return an error', async () => {
      (generateAttackDiscoveries as jest.Mock).mockRejectedValue(testInvokeError);

      const executionUuid = 'test-1';
      const results = await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
      });

      expect(results).toEqual({ error: testInvokeError });
    });
  });

  describe('when `reportAttackDiscoveryGenerationSuccess` throws an error', () => {
    beforeEach(() => {
      (reportAttackDiscoveryGenerationSuccess as jest.Mock).mockImplementation(() => {
        throw testUpdateError;
      });
    });

    it('should NOT call `handleGraphError`', async () => {
      const executionUuid = 'test-1';
      await generateAndUpdateAttackDiscoveries({
        actionsClient: mockActionsClient,
        authenticatedUser: mockAuthenticatedUser,
        config: mockConfig,
        dataClient: mockDataClient,
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
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
        enableFieldRendering: true,
        esClient: mockEsClient,
        executionUuid,
        logger: mockLogger,
        savedObjectsClient: mockSavedObjectsClient,
        telemetry: mockTelemetry,
        withReplacements: false,
      });

      expect(results).toEqual({
        anonymizedAlerts: mockAnonymizedAlerts,
        attackDiscoveries: mockAttackDiscoveries,
        replacements: mockConfig.replacements,
      });
    });
  });
});

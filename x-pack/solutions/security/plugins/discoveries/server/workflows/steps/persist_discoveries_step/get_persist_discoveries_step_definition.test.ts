/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import { getPersistDiscoveriesStepDefinition } from './get_persist_discoveries_step_definition';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { validateAttackDiscoveries } from '../../../routes/post/validate/helpers/validate_attack_discoveries';
import { authenticateAndGetSpace } from '../default_validation_step/helpers/authenticate_and_get_space';

jest.mock('../../helpers/resolve_connector_details', () => ({
  resolveConnectorDetails: jest.fn(),
}));

jest.mock('../../../routes/post/validate/helpers/validate_attack_discoveries', () => ({
  validateAttackDiscoveries: jest.fn(),
}));

jest.mock('../default_validation_step/helpers/authenticate_and_get_space', () => ({
  authenticateAndGetSpace: jest.fn(),
}));

const mockResolveConnectorDetails = resolveConnectorDetails as jest.MockedFunction<
  typeof resolveConnectorDetails
>;
const mockValidateAttackDiscoveries = validateAttackDiscoveries as jest.MockedFunction<
  typeof validateAttackDiscoveries
>;
const mockAuthenticateAndGetSpace = authenticateAndGetSpace as jest.MockedFunction<
  typeof authenticateAndGetSpace
>;

describe('getPersistDiscoveriesStepDefinition', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockAdhocAttackDiscoveryDataClient = {
    getReader: jest.fn(),
    getWriter: jest.fn(),
    indexNameWithNamespace: jest.fn(),
  } as unknown as IRuleDataClient;

  const mockActionsClient = { get: jest.fn() };

  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: {
      elasticsearch: {
        client: {
          asInternalUser: {
            indices: {
              refresh: jest.fn(),
            },
          },
        },
      },
    },
    pluginsStart: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
    },
  });

  const mockAuthenticatedUser = {
    profile_uid: 'profile-1',
    username: 'test-user',
  } as unknown as AuthenticatedUser;

  const mockEsClient = {};

  const mockContext = {
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: { id: 'workflow-run-1' },
        workflow: { id: 'workflow-1' },
      }),
      getFakeRequest: jest.fn().mockReturnValue({
        headers: {},
      }),
    },
    input: {
      alerts_context_count: 10,
      anonymized_alerts: [],
      api_config: { action_type_id: '.gen-ai', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['alert-1'],
          details_markdown: 'Details',
          entity_summary_markdown: 'Entity',
          mitre_attack_tactics: ['Initial Access'],
          summary_markdown: 'Summary',
          title: 'Test Discovery',
        },
      ],
      connector_name: 'Test Connector',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      replacements: {},
      with_replacements: false,
    },
    logger: {
      error: jest.fn(),
      info: jest.fn(),
    },
  };

  const getOutputOrThrow = <T>(result: { output?: T }): T => {
    if (!result.output) {
      throw new Error('Expected result.output to be defined');
    }

    return result.output;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveConnectorDetails.mockResolvedValue({
      actionTypeId: '.gen-ai',
      connectorName: 'Test Connector',
    });

    mockAuthenticateAndGetSpace.mockResolvedValue({
      authenticationInfo: {},
      authenticatedUser: mockAuthenticatedUser,
      esClient: mockEsClient,
      spaceId: 'default',
    } as unknown as Awaited<ReturnType<typeof authenticateAndGetSpace>>);
  });

  describe('step definition metadata', () => {
    it('has the correct id', () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      expect(stepDefinition.id).toBe('security.attack-discovery.persistDiscoveries');
    });
  });

  describe('when persistence succeeds', () => {
    const persistedDiscoveries = [
      {
        alert_ids: ['alert-1'],
        connector_id: 'connector-1',
        connector_name: 'Test Connector',
        details_markdown: 'Details',
        generation_uuid: 'generation-1',
        id: 'discovery-1',
        summary_markdown: 'Summary',
        timestamp: '2025-01-01T00:00:00Z',
        title: 'Test Discovery',
      },
    ];

    beforeEach(() => {
      mockValidateAttackDiscoveries.mockResolvedValue({
        duplicates_dropped_count: 0,
        validated_discoveries: persistedDiscoveries,
      });
    });

    it('returns persisted discoveries', async () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output).toEqual({
        duplicates_dropped_count: 0,
        persisted_discoveries: persistedDiscoveries,
      });
    });

    it('calls validateAttackDiscoveries with the correct arguments', async () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockValidateAttackDiscoveries).toHaveBeenCalledWith({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        authenticatedUser: mockAuthenticatedUser,
        logger: expect.objectContaining({
          debug: expect.any(Function),
          error: expect.any(Function),
          fatal: expect.any(Function),
          get: expect.any(Function),
          info: expect.any(Function),
          isLevelEnabled: expect.any(Function),
          log: expect.any(Function),
          trace: expect.any(Function),
          warn: expect.any(Function),
        }),
        spaceId: 'default',
        validateRequestBody: {
          alerts_context_count: 10,
          anonymized_alerts: [],
          api_config: { action_type_id: '.gen-ai', connector_id: 'connector-1' },
          attack_discoveries: mockContext.input.attack_discoveries,
          connector_name: 'Test Connector',
          enable_field_rendering: true,
          generation_uuid: 'generation-1',
          replacements: {},
          with_replacements: false,
        },
      });
    });

    it('logs a success message', async () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Persisting 1 attack discoveries')
      );
    });
  });

  describe('when source is scheduled', () => {
    it('skips persistence and returns empty output without calling validateAttackDiscoveries', async () => {
      const scheduledContext = {
        ...mockContext,
        input: {
          ...mockContext.input,
          source: 'scheduled',
        },
      };

      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(scheduledContext as never);

      const output = getOutputOrThrow(result);

      expect(output).toEqual({
        duplicates_dropped_count: 0,
        persisted_discoveries: [],
      });
      expect(mockValidateAttackDiscoveries).not.toHaveBeenCalled();
    });

    it('does not call getStartServices for scheduled executions', async () => {
      const scheduledContext = {
        ...mockContext,
        input: {
          ...mockContext.input,
          source: 'scheduled',
        },
      };

      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(scheduledContext as never);

      expect(mockGetStartServices).not.toHaveBeenCalled();
    });
  });

  describe('when no discoveries are provided', () => {
    it('returns empty persisted_discoveries without calling validateAttackDiscoveries', async () => {
      const contextWithNoDiscoveries = {
        ...mockContext,
        input: {
          ...mockContext.input,
          attack_discoveries: [],
        },
      };

      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(contextWithNoDiscoveries as never);

      const output = getOutputOrThrow(result);

      expect(output).toEqual({
        duplicates_dropped_count: 0,
        persisted_discoveries: [],
      });
      expect(mockValidateAttackDiscoveries).not.toHaveBeenCalled();
    });
  });

  describe('when authentication fails', () => {
    beforeEach(() => {
      mockAuthenticateAndGetSpace.mockResolvedValue({
        authenticationInfo: {},
        authenticatedUser: undefined,
        esClient: mockEsClient,
        spaceId: 'default',
      } as unknown as Awaited<ReturnType<typeof authenticateAndGetSpace>>);
    });

    it('returns an error', async () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to persist discoveries',
        expect.any(Error)
      );
    });
  });

  describe('when connector_id is missing from api_config', () => {
    beforeEach(() => {
      mockAuthenticateAndGetSpace.mockResolvedValue({
        authenticationInfo: {},
        authenticatedUser: mockAuthenticatedUser,
        esClient: mockEsClient,
        spaceId: 'default',
      } as unknown as Awaited<ReturnType<typeof authenticateAndGetSpace>>);
    });

    it('returns an error about missing connector_id', async () => {
      const contextWithoutConnectorId = {
        ...mockContext,
        input: {
          ...mockContext.input,
          api_config: {},
        },
      };

      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(contextWithoutConnectorId as never);

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to persist discoveries',
        expect.objectContaining({
          message: 'Missing connector_id in api_config',
        })
      );
    });
  });

  describe('when persistence fails with an error', () => {
    const persistenceError = new Error('Bulk insert failed');

    beforeEach(() => {
      mockValidateAttackDiscoveries.mockRejectedValue(persistenceError);
    });

    it('logs the error to the context logger', async () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to persist discoveries',
        expect.any(Error)
      );
    });

    it('returns an error object', async () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      expect(result).toHaveProperty('error');
    });
  });

  describe('when spaceId is missing', () => {
    beforeEach(() => {
      mockAuthenticateAndGetSpace.mockResolvedValue({
        authenticationInfo: {},
        authenticatedUser: mockAuthenticatedUser,
        esClient: mockEsClient,
        spaceId: undefined,
      } as unknown as Awaited<ReturnType<typeof authenticateAndGetSpace>>);
    });

    it('returns an error about missing space id', async () => {
      const stepDefinition = getPersistDiscoveriesStepDefinition({
        adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to persist discoveries',
        expect.objectContaining({
          message: 'Failed to resolve space id',
        })
      );
    });
  });
});

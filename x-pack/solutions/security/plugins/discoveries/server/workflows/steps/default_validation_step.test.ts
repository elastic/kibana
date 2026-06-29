/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { getDefaultValidationStepDefinition } from './default_validation_step';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import { filterHallucinatedAlerts } from '@kbn/discoveries/impl/attack_discovery/hallucination_detection';

jest.mock('@kbn/discoveries/impl/lib/helpers/get_space_id', () => ({
  getSpaceId: jest.fn(),
}));

jest.mock('@kbn/discoveries/impl/attack_discovery/hallucination_detection', () => ({
  ...jest.requireActual('@kbn/discoveries/impl/attack_discovery/hallucination_detection'),
  filterHallucinatedAlerts: jest.fn(),
}));

const mockUuid = 'mock-generated-uuid';
jest.mock('uuid', () => ({
  v4: () => mockUuid,
}));

describe('getDefaultValidationStepDefinition', () => {
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockAuthenticate: jest.Mock;
  let mockAsScoped: jest.Mock;
  let mockGetStartServices: jest.Mock;
  let stepDefinition: ReturnType<typeof getDefaultValidationStepDefinition>;

  const mockRequest = { headers: { authorization: 'ApiKey abc' } };

  const defaultInput = {
    alerts_context_count: 1,
    anonymized_alerts: [{ metadata: {}, page_content: 'a' }],
    api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
    attack_discoveries: [
      {
        alert_ids: ['a1'],
        details_markdown: 'details',
        entity_summary_markdown: 'entity',
        mitre_attack_tactics: ['Execution'],
        summary_markdown: 'summary',
        timestamp: '2025-12-15T18:39:20.762Z',
        title: 'title',
      },
    ],
    connector_name: 'Connector 1',
    generation_uuid: 'generation-1',
  };

  const createContext = (input = defaultInput): StepHandlerContext<unknown> =>
    ({
      contextManager: {
        getContext: () => ({
          execution: {
            id: 'test-workflow-run-id',
          },
          workflow: {
            id: 'test-workflow-id',
            spaceId: 'default',
          },
        }),
        getFakeRequest: () => mockRequest,
      },
      input,
      logger: { error: jest.fn(), info: jest.fn() },
    } as unknown as StepHandlerContext<unknown>);

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggerMock.create();
    mockAuthenticate = jest.fn().mockResolvedValue({ profile_uid: 'p1', username: 'u1' });
    mockAsScoped = jest.fn().mockReturnValue({
      asCurrentUser: {
        security: { authenticate: mockAuthenticate },
        search: jest.fn(),
      },
    });
    mockGetStartServices = jest.fn().mockResolvedValue({
      coreStart: {
        elasticsearch: { client: { asScoped: mockAsScoped } },
      } as unknown,
      pluginsStart: {
        actions: {
          getActionsClientWithRequest: jest.fn().mockResolvedValue({
            get: jest.fn().mockResolvedValue({
              actionTypeId: '.gen',
              name: 'Connector 1',
            }),
          }),
        },
        spaces: { spacesService: null },
      } as unknown,
    });

    stepDefinition = getDefaultValidationStepDefinition({
      getStartServices: mockGetStartServices,
      logger: mockLogger,
    });

    (getSpaceId as jest.Mock).mockReturnValue('default');

    (filterHallucinatedAlerts as jest.Mock).mockImplementation(({ attackDiscoveries }) =>
      Promise.resolve(attackDiscoveries)
    );
  });

  describe('successful validation', () => {
    it('returns output with validated_discoveries', async () => {
      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.output?.validated_discoveries).toHaveLength(1);
    });

    it('returns output without error property', async () => {
      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.error).toBeUndefined();
    });

    it('returns transformed discoveries with connector metadata', async () => {
      const context = createContext();

      const result = await stepDefinition.handler(context);

      const discovery = result.output?.validated_discoveries[0] as Record<string, unknown>;
      expect(discovery.connector_id).toBe('connector-1');
      expect(discovery.connector_name).toBe('Connector 1');
      expect(discovery.generation_uuid).toBe('generation-1');
    });

    it('returns filtered_count of 0 when all discoveries pass', async () => {
      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.output?.filtered_count).toBe(0);
    });
  });

  describe('authentication', () => {
    it('calls authenticate on elasticsearch client', async () => {
      const context = createContext();

      await stepDefinition.handler(context);

      expect(mockAuthenticate).toHaveBeenCalled();
    });

    it('returns error when authentication fails', async () => {
      mockAuthenticate.mockRejectedValue(new Error('auth failed'));

      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.error).toBeDefined();
    });

    it('returns error message when authentication fails', async () => {
      mockAuthenticate.mockRejectedValue(new Error('auth failed'));

      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.error?.message).toBe('auth failed');
    });
  });

  describe('error handling', () => {
    it('returns generic error message when non-Error is thrown', async () => {
      mockAuthenticate.mockRejectedValue('boom');

      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.error?.message).toBe('Failed to validate discoveries');
    });

    it('returns error when non-Error is thrown', async () => {
      mockAuthenticate.mockRejectedValue('boom');

      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.error).toBeDefined();
    });
  });

  describe('space resolution', () => {
    it('calls getSpaceId with spaces service', async () => {
      const context = createContext();

      await stepDefinition.handler(context);

      expect(getSpaceId).toHaveBeenCalledWith({
        request: mockRequest,
        spaces: null,
      });
    });
  });

  describe('empty attack discoveries', () => {
    it('returns empty array when attack_discoveries is null', async () => {
      const inputWithNullDiscoveries = {
        ...defaultInput,
        attack_discoveries: null,
      };
      const context = createContext(inputWithNullDiscoveries as never);

      const result = await stepDefinition.handler(context);

      expect(result.output?.validated_discoveries).toEqual([]);
    });

    it('returns empty array when attack_discoveries is empty', async () => {
      const inputWithEmptyDiscoveries = {
        ...defaultInput,
        attack_discoveries: [],
      };
      const context = createContext(inputWithEmptyDiscoveries);

      const result = await stepDefinition.handler(context);

      expect(result.output?.validated_discoveries).toEqual([]);
    });

    it('returns filter_reason no_discoveries when empty', async () => {
      const inputWithEmptyDiscoveries = {
        ...defaultInput,
        attack_discoveries: [],
      };
      const context = createContext(inputWithEmptyDiscoveries);

      const result = await stepDefinition.handler(context);

      expect(result.output?.filter_reason).toBe('no_discoveries');
      expect(result.output?.filtered_count).toBe(0);
    });

    it('logs info message when no discoveries to validate', async () => {
      const inputWithEmptyDiscoveries = {
        ...defaultInput,
        attack_discoveries: [],
      };
      const context = createContext(inputWithEmptyDiscoveries);

      await stepDefinition.handler(context);

      expect(context.logger.info).toHaveBeenCalledWith('No attack discoveries to validate');
    });
  });

  describe('logging', () => {
    it('logs debug message with parsed input', async () => {
      const context = createContext();

      await stepDefinition.handler(context);

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('logs info message with validation count', async () => {
      const context = createContext();

      await stepDefinition.handler(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        'Validating 1 attack discoveries (generation: generation-1)'
      );
    });
  });

  describe('error logging', () => {
    it('logs debug message when error occurs', async () => {
      mockAuthenticate.mockRejectedValue(new Error('test error'));

      const context = createContext();

      await stepDefinition.handler(context);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('logs error to context logger', async () => {
      mockAuthenticate.mockRejectedValue(new Error('test error'));

      const context = createContext();

      await stepDefinition.handler(context);

      expect(context.logger.error).toHaveBeenCalledWith(
        'Failed to validate discoveries',
        expect.any(Error)
      );
    });
  });

  describe('hallucination detection', () => {
    it('calls filterHallucinatedAlerts with correct parameters', async () => {
      const context = createContext();

      await stepDefinition.handler(context);

      expect(filterHallucinatedAlerts).toHaveBeenCalledWith({
        alertsIndexPattern: '.alerts-security.alerts-*',
        attackDiscoveries: defaultInput.attack_discoveries,
        esClient: expect.anything(),
        logger: expect.objectContaining({
          debug: expect.any(Function),
          error: expect.any(Function),
          info: expect.any(Function),
          warn: expect.any(Function),
        }),
      });
    });

    it('uses custom alerts_index_pattern when provided', async () => {
      const inputWithCustomPattern = {
        ...defaultInput,
        alerts_index_pattern: '.custom-alerts-*',
      };
      const context = createContext(inputWithCustomPattern);

      await stepDefinition.handler(context);

      expect(filterHallucinatedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          alertsIndexPattern: '.custom-alerts-*',
        })
      );
    });

    it('returns empty array when all discoveries are filtered out', async () => {
      (filterHallucinatedAlerts as jest.Mock).mockResolvedValue([]);

      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.output?.validated_discoveries).toEqual([]);
    });

    it('returns hallucinated_alert_ids filter_reason when all filtered', async () => {
      (filterHallucinatedAlerts as jest.Mock).mockResolvedValue([]);

      const context = createContext();

      const result = await stepDefinition.handler(context);

      expect(result.output?.filter_reason).toBe('hallucinated_alert_ids');
      expect(result.output?.filtered_count).toBe(1);
    });

    it('logs info message when all discoveries are filtered out', async () => {
      (filterHallucinatedAlerts as jest.Mock).mockResolvedValue([]);

      const context = createContext();

      await stepDefinition.handler(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        'All attack discoveries were filtered out due to hallucinated alert IDs'
      );
    });
  });
});

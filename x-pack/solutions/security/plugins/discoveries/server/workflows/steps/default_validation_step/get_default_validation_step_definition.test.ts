/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { getDefaultValidationStepDefinition } from './get_default_validation_step_definition';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { authenticateAndGetSpace } from './helpers/authenticate_and_get_space';
import {
  filterAndValidateDiscoveries,
  type FilterResult,
} from './helpers/filter_and_validate_discoveries';
import { transformDiscoveriesToOutputFormat } from './helpers/transform_discoveries_to_output_format';

jest.mock('../../helpers/resolve_connector_details', () => ({
  resolveConnectorDetails: jest.fn(),
}));

jest.mock('./helpers/authenticate_and_get_space', () => ({
  authenticateAndGetSpace: jest.fn(),
}));

jest.mock('./helpers/filter_and_validate_discoveries', () => ({
  filterAndValidateDiscoveries: jest.fn(),
}));

jest.mock('./helpers/transform_discoveries_to_output_format', () => ({
  transformDiscoveriesToOutputFormat: jest.fn(),
}));

const mockResolveConnectorDetails = resolveConnectorDetails as jest.MockedFunction<
  typeof resolveConnectorDetails
>;
const mockAuthenticateAndGetSpace = authenticateAndGetSpace as jest.MockedFunction<
  typeof authenticateAndGetSpace
>;
const mockFilterAndValidateDiscoveries = filterAndValidateDiscoveries as jest.MockedFunction<
  typeof filterAndValidateDiscoveries
>;
const mockTransformDiscoveriesToOutputFormat =
  transformDiscoveriesToOutputFormat as jest.MockedFunction<
    typeof transformDiscoveriesToOutputFormat
  >;

describe('getDefaultValidationStepDefinition', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockActionsClient = { get: jest.fn() };

  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: {},
    pluginsStart: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
    },
  });

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
      alerts_index_pattern: '.alerts-security.alerts-default',
      anonymized_alerts: [],
      api_config: { connector_id: 'connector-1' },
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

  const transformedDiscoveries = [
    {
      alert_ids: ['alert-1'],
      connector_id: 'connector-1',
      connector_name: 'Test Connector',
      details_markdown: 'Details',
      entity_summary_markdown: 'Entity',
      generation_uuid: 'generation-1',
      id: 'generated-id',
      mitre_attack_tactics: ['Initial Access'],
      summary_markdown: 'Summary',
      timestamp: '2025-01-01T00:00:00Z',
      title: 'Test Discovery',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveConnectorDetails.mockResolvedValue({
      actionTypeId: '.gen-ai',
      connectorName: 'Test Connector',
    });

    mockAuthenticateAndGetSpace.mockResolvedValue({
      authenticationInfo: {},
      authenticatedUser: { profile_uid: 'profile-1', username: 'test-user' },
      esClient: mockEsClient,
      spaceId: 'default',
    } as unknown as Awaited<ReturnType<typeof authenticateAndGetSpace>>);

    mockTransformDiscoveriesToOutputFormat.mockReturnValue(transformedDiscoveries);
  });

  describe('when validation succeeds with discoveries', () => {
    beforeEach(() => {
      mockFilterAndValidateDiscoveries.mockResolvedValue({
        filteredCount: 0,
        shouldValidate: true,
        validDiscoveries: mockContext.input.attack_discoveries,
      } as FilterResult<(typeof mockContext.input.attack_discoveries)[number]>);
    });

    it('returns validated discoveries from transformDiscoveriesToOutputFormat', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output.validated_discoveries).toEqual(transformedDiscoveries);
    });

    it('returns filtered_count of 0 when no discoveries were filtered', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output.filtered_count).toBe(0);
    });

    it('does not include filter_reason when no discoveries were filtered', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output).not.toHaveProperty('filter_reason');
    });

    it('calls transformDiscoveriesToOutputFormat with the correct arguments', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockTransformDiscoveriesToOutputFormat).toHaveBeenCalledWith({
        attackDiscoveries: mockContext.input.attack_discoveries,
        connectorId: 'connector-1',
        connectorName: 'Test Connector',
        generationUuid: 'generation-1',
        replacements: {},
      });
    });
  });

  describe('when some discoveries are filtered by hallucination detection', () => {
    beforeEach(() => {
      mockFilterAndValidateDiscoveries.mockResolvedValue({
        filteredCount: 2,
        filterReason: 'hallucinated_alert_ids',
        shouldValidate: true,
        validDiscoveries: mockContext.input.attack_discoveries,
      } as FilterResult<(typeof mockContext.input.attack_discoveries)[number]>);
    });

    it('returns the filtered_count from filterAndValidateDiscoveries', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output.filtered_count).toBe(2);
    });

    it('returns the filter_reason from filterAndValidateDiscoveries', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output.filter_reason).toBe('hallucinated_alert_ids');
    });
  });

  describe('when no discoveries pass filtering', () => {
    beforeEach(() => {
      mockFilterAndValidateDiscoveries.mockResolvedValue({
        filteredCount: 1,
        filterReason: 'hallucinated_alert_ids',
        shouldValidate: false,
        validDiscoveries: [],
      } as FilterResult<(typeof mockContext.input.attack_discoveries)[number]>);
    });

    it('returns empty validated_discoveries array', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output.validated_discoveries).toEqual([]);
    });

    it('returns the filtered_count and filter_reason', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output.filtered_count).toBe(1);
      expect(output.filter_reason).toBe('hallucinated_alert_ids');
    });

    it('does not call transformDiscoveriesToOutputFormat', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockTransformDiscoveriesToOutputFormat).not.toHaveBeenCalled();
    });

    it('logs a warning about no discoveries to validate', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No discoveries to validate after filtering')
      );
    });
  });

  describe('when no_discoveries filter reason is returned', () => {
    beforeEach(() => {
      mockFilterAndValidateDiscoveries.mockResolvedValue({
        filteredCount: 0,
        filterReason: 'no_discoveries',
        shouldValidate: false,
        validDiscoveries: [],
      } as FilterResult<(typeof mockContext.input.attack_discoveries)[number]>);
    });

    it('returns filter_reason no_discoveries and filtered_count 0', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      const output = getOutputOrThrow(result);

      expect(output.filtered_count).toBe(0);
      expect(output.filter_reason).toBe('no_discoveries');
    });
  });

  describe('when authentication fails', () => {
    beforeEach(() => {
      mockAuthenticateAndGetSpace.mockRejectedValue(new Error('auth failed'));
    });

    it('logs an error and returns error result', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(mockContext as never);

      expect(mockContext.logger.error).toHaveBeenCalled();
      expect(result.error).toBeDefined();
    });
  });

  describe('when connector_id is missing from api_config', () => {
    beforeEach(() => {
      mockFilterAndValidateDiscoveries.mockResolvedValue({
        filteredCount: 0,
        shouldValidate: true,
        validDiscoveries: mockContext.input.attack_discoveries,
      } as FilterResult<(typeof mockContext.input.attack_discoveries)[number]>);
    });

    it('logs an error about missing connector_id', async () => {
      const contextWithoutConnectorId = {
        ...mockContext,
        input: {
          ...mockContext.input,
          api_config: {},
        },
      };

      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      const result = await stepDefinition.handler(contextWithoutConnectorId as never);

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to validate discoveries',
        expect.objectContaining({
          message: 'Missing connector_id in api_config',
        })
      );
      expect(result.output?.validated_discoveries ?? []).toEqual([]);
    });
  });

  describe('when filterAndValidateDiscoveries throws an error', () => {
    beforeEach(() => {
      mockFilterAndValidateDiscoveries.mockRejectedValue(new Error('filter failed'));
    });

    it('logs the error to the context logger', async () => {
      const stepDefinition = getDefaultValidationStepDefinition({
        getStartServices: mockGetStartServices,
        logger: mockLogger,
      });

      await stepDefinition.handler(mockContext as never);

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        'Failed to validate discoveries',
        expect.any(Error)
      );
    });
  });
});

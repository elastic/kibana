/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { getDefaultAlertRetrievalStepDefinition } from './default_alert_retrieval_step';
import { DefaultAlertRetrievalStepTypeId } from '../../../common/step_types/default_alert_retrieval_step';
import { getAnonymizedAlerts } from '@kbn/discoveries/impl/attack_discovery/graphs';

jest.mock('@kbn/discoveries/impl/attack_discovery/graphs', () => ({
  ...jest.requireActual('@kbn/discoveries/impl/attack_discovery/graphs'),
  getAnonymizedAlerts: jest.fn(),
}));

const mockGetAnonymizedAlerts = getAnonymizedAlerts as jest.Mock;

describe('DefaultAlertRetrievalStepDefinition', () => {
  const mockLogger: Logger = loggerMock.create();
  const mockCoreStart = coreMock.createStart();
  const mockActionsClient = actionsClientMock.create();
  const mockEsClient = mockCoreStart.elasticsearch.client.asScoped({} as any).asCurrentUser;
  const mockEventLogger = { logEvent: jest.fn() };
  const mockGetEventLogger = jest.fn().mockResolvedValue(mockEventLogger);
  const mockGetEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log-*');

  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: mockCoreStart,
    pluginsStart: {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
    },
  });

  const mockAnonymizationFields: AnonymizationFieldResponse[] = [
    {
      allowed: true,
      anonymized: true,
      field: 'host.name',
      id: 'field-1',
    },
    {
      allowed: true,
      anonymized: true,
      field: 'user.name',
      id: 'field-2',
    },
  ];

  const defaultProps = {
    alerts_index_pattern: '.alerts-security.alerts-default',
    anonymization_fields: mockAnonymizationFields,
    api_config: {
      action_type_id: '.gemini',
      connector_id: 'test-connector',
      model: 'test-model',
    },
    size: 10,
  };

  const mockContext = {
    abortSignal: undefined,
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: {
          id: 'test-execution-id',
        },
        workflow: {
          id: 'test-workflow-id',
          spaceId: 'default',
        },
      }),
      getFakeRequest: jest.fn().mockReturnValue({}),
    },
    input: defaultProps,
    logger: mockLogger,
  };

  const mockAnonymizedAlertStrings = [
    'timestamp,2025-01-01T00:00:00Z,host.name,HOST_001,user.name,USER_001',
    'timestamp,2025-01-01T00:01:00Z,host.name,HOST_001,user.name,USER_002',
  ];

  const getOutputOrThrow = <T>(result: { output?: T }): T => {
    if (!result.output) {
      throw new Error('Expected result.output to be defined');
    }

    return result.output;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockActionsClient.get.mockResolvedValue({
      id: 'test-connector',
      name: 'Test Connector',
    } as any);
  });

  const createStepDefinition = () =>
    getDefaultAlertRetrievalStepDefinition({
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
    });

  describe('successful alert retrieval', () => {
    it('returns anonymized alerts as strings', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.alerts).toEqual(mockAnonymizedAlertStrings);
    });

    it('returns alerts_context_count matching number of alerts', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.alerts_context_count).toBe(2);
    });

    it('returns anonymized_alerts in Document format', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.anonymized_alerts).toEqual([
        {
          metadata: {},
          page_content: 'timestamp,2025-01-01T00:00:00Z,host.name,HOST_001,user.name,USER_001',
        },
        {
          metadata: {},
          page_content: 'timestamp,2025-01-01T00:01:00Z,host.name,HOST_001,user.name,USER_002',
        },
      ]);
    });

    it('returns api_config passed through from input', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.api_config).toEqual({
        action_type_id: '.gemini',
        connector_id: 'test-connector',
        model: 'test-model',
      });
    });

    it('returns connector_name from Actions client', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.connector_name).toBe('Test Connector');
    });

    it('returns empty replacements when none provided', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.replacements).toEqual({});
    });

    it('returns updated replacements from anonymization', async () => {
      const inputReplacements = { server1: 'SERVER_001' };
      const updatedReplacements = { server1: 'SERVER_001', server2: 'SERVER_002' };

      mockGetAnonymizedAlerts.mockImplementation(({ onNewReplacements }) => {
        onNewReplacements?.(updatedReplacements);
        return Promise.resolve(mockAnonymizedAlertStrings);
      });

      const contextWithReplacements = {
        ...mockContext,
        input: {
          ...mockContext.input,
          replacements: inputReplacements,
        },
      };

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(contextWithReplacements as any);
      const output = getOutputOrThrow(result);

      expect(output.replacements).toEqual(updatedReplacements);
    });
  });

  describe('getAnonymizedAlerts invocation', () => {
    it('invokes getAnonymizedAlerts with correct parameters', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(mockContext as any);

      expect(mockGetAnonymizedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [
            {
              allowed: true,
              anonymized: false,
              field: '_id',
              id: 'field-_id',
            },
            ...mockAnonymizationFields,
          ],
          end: undefined,
          esClient: mockEsClient,
          filter: undefined,
          onNewReplacements: expect.any(Function),
          replacements: {},
          size: 10,
          start: undefined,
        })
      );
    });

    it('passes optional start and end parameters', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const contextWithTimeRange = {
        ...mockContext,
        input: {
          ...mockContext.input,
          end: 'now',
          start: 'now-24h',
        },
      };

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(contextWithTimeRange as any);

      expect(mockGetAnonymizedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          end: 'now',
          start: 'now-24h',
        })
      );
    });

    it('passes optional filter parameter', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const filter = { term: { 'host.name': 'server1' } };
      const contextWithFilter = {
        ...mockContext,
        input: {
          ...mockContext.input,
          filter,
        },
      };

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(contextWithFilter as any);

      expect(mockGetAnonymizedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          filter,
        })
      );
    });

    it('passes existing replacements to getAnonymizedAlerts', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const existingReplacements = { host1: 'HOST_001', user1: 'USER_001' };
      const contextWithReplacements = {
        ...mockContext,
        input: {
          ...mockContext.input,
          replacements: existingReplacements,
        },
      };

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(contextWithReplacements as any);

      expect(mockGetAnonymizedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          replacements: existingReplacements,
        })
      );
    });
  });

  describe('connector name retrieval', () => {
    it('returns an error when connector lookup fails', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);
      mockActionsClient.get.mockRejectedValue(new Error('Connector not found'));

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Connector not found');
    });

    it('retrieves connector by ID from api_config', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(mockContext as any);

      expect(mockActionsClient.get).toHaveBeenCalledWith({
        id: 'test-connector',
      });
    });
  });

  describe('error handling', () => {
    it('returns error when getAnonymizedAlerts fails', async () => {
      const alertError = new Error('Failed to retrieve alerts from Elasticsearch');
      mockGetAnonymizedAlerts.mockRejectedValue(alertError);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Failed to retrieve alerts from Elasticsearch');
    });

    it('logs error when alert retrieval fails', async () => {
      const alertError = new Error('ES connection timeout');
      mockGetAnonymizedAlerts.mockRejectedValue(alertError);

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(mockContext as any);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve alerts', alertError);
    });

    it('handles non-Error exceptions', async () => {
      mockGetAnonymizedAlerts.mockRejectedValue('String error');

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);

      expect(result.error?.message).toBe('Failed to retrieve alerts');
    });
  });

  describe('empty results', () => {
    it('handles zero alerts returned', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue([]);

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(mockContext as any);
      const output = getOutputOrThrow(result);

      expect(output.alerts).toEqual([]);
      expect(output.alerts_context_count).toBe(0);
      expect(output.anonymized_alerts).toEqual([]);
    });
  });

  describe('logging', () => {
    it('logs retrieval start with index pattern and size', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(mockContext as any);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrieving alerts from .alerts-security.alerts-default with size 10'
      );
    });

    it('logs retrieval completion with count', async () => {
      mockGetAnonymizedAlerts.mockResolvedValue(mockAnonymizedAlertStrings);

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(mockContext as any);

      expect(mockLogger.info).toHaveBeenCalledWith('Retrieved and anonymized 2 alerts');
    });
  });

  describe('ES|QL path', () => {
    const esqlQuery = 'FROM .alerts-security.alerts-default METADATA _id | LIMIT 10';

    const esqlContext = {
      ...mockContext,
      input: {
        ...mockContext.input,
        esql_query: esqlQuery,
      },
    };

    it('uses ES|QL query when esql_query is provided', async () => {
      (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
        columns: [{ name: 'host.name' }],
        values: [['server-1']],
      });

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(esqlContext as any);

      expect(mockEsClient.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: esqlQuery,
        })
      );
    });

    it('does NOT call getAnonymizedAlerts when esql_query is provided', async () => {
      (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
        columns: [{ name: 'host.name' }],
        values: [['server-1']],
      });

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(esqlContext as any);

      expect(mockGetAnonymizedAlerts).not.toHaveBeenCalled();
    });

    it('does NOT pass a filter to the ES|QL query', async () => {
      (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
        columns: [{ name: 'host.name' }],
        values: [['server-1']],
      });

      const stepDefinition = createStepDefinition();

      await stepDefinition.handler(esqlContext as any);

      const callArgs = (mockEsClient.esql.query as jest.Mock).mock.calls[0][0] as Record<
        string,
        unknown
      >;

      expect(callArgs.filter).toBeUndefined();
    });

    it('returns alerts from ES|QL results', async () => {
      (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
        columns: [{ name: 'host.name' }, { name: 'user.name' }],
        values: [
          ['server-1', 'admin'],
          ['server-2', 'root'],
        ],
      });

      const stepDefinition = createStepDefinition();

      const result = await stepDefinition.handler(esqlContext as any);
      const output = getOutputOrThrow(result);

      expect(output.alerts.length).toBe(2);
      expect(output.alerts_context_count).toBe(2);
    });
  });

  describe('step metadata', () => {
    it('has correct step type ID', () => {
      const stepDefinition = createStepDefinition();

      expect(stepDefinition.id).toBe(DefaultAlertRetrievalStepTypeId);
      expect(DefaultAlertRetrievalStepTypeId).toBe(
        'security.attack-discovery.defaultAlertRetrieval'
      );
    });
  });
});

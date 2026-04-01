/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import { omit } from 'lodash/fp';

import {
  callInternalGenerateApi,
  callPublicGenerateApi,
  getGenAiConfig,
  getRequestBody,
  getWorkflowConfig,
  OpenAiProviderType,
} from './helpers';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import * as workflowConfigModule from '../settings_flyout/workflow_configuration';

jest.mock('../settings_flyout/workflow_configuration');

const connector = createMockActionConnector({
  actionTypeId: '.gen-ai',
  config: {
    apiProvider: 'Azure OpenAI',
    apiUrl:
      'https://example.com/openai/deployments/example/chat/completions?api-version=2024-02-15-preview',
  },
  id: '15b4f8df-e2ca-4060-81a1-3bd2a2bffc7e',
  isMissingSecrets: false,
  name: 'Azure OpenAI GPT-4o',
  secrets: { secretTextField: 'a secret' },
});

describe('getGenAiConfig', () => {
  describe('when connector is preconfigured', () => {
    it('returns undefined', () => {
      const preconfigured = {
        ...connector,
        isPreconfigured: true,
      };

      const result = getGenAiConfig(preconfigured);

      expect(result).toBeUndefined();
    });
  });

  describe('when connector is NOT preconfigured', () => {
    let result: ReturnType<typeof getGenAiConfig>;

    beforeEach(() => {
      result = getGenAiConfig(connector);
    });

    it('returns apiProvider', () => {
      expect(result?.apiProvider).toBe(connector.config.apiProvider);
    });

    it('returns apiUrl', () => {
      expect(result?.apiUrl).toBe(connector.config.apiUrl);
    });

    it('returns defaultModel', () => {
      expect(result?.defaultModel).toBe('2024-02-15-preview');
    });
  });

  describe('when connector is Azure OpenAI', () => {
    it('extracts api-version from URL as defaultModel', () => {
      const result = getGenAiConfig(connector);

      expect(result?.defaultModel).toBe('2024-02-15-preview');
    });
  });

  describe('when connector is NON-Azure OpenAI', () => {
    describe('and config does NOT include a default model', () => {
      const apiProvider = 'OpenAI';
      let result: ReturnType<typeof getGenAiConfig>;

      beforeEach(() => {
        const openAiConnector = {
          ...connector,
          config: {
            ...connector.config,
            apiProvider,
          },
        };
        result = getGenAiConfig(openAiConnector);
      });

      it('returns apiProvider', () => {
        expect(result?.apiProvider).toBe(apiProvider);
      });

      it('returns apiUrl', () => {
        expect(result?.apiUrl).toBe(connector.config.apiUrl);
      });

      it('returns undefined defaultModel', () => {
        expect(result?.defaultModel).toBeUndefined();
      });
    });

    describe('and config includes a default model', () => {
      const apiProvider = 'OpenAI';
      const defaultModel = 'aDefaultModel';
      let result: ReturnType<typeof getGenAiConfig>;

      beforeEach(() => {
        const withDefaultModel = {
          ...connector,
          config: {
            ...connector.config,
            apiProvider,
            defaultModel,
          },
        };
        result = getGenAiConfig(withDefaultModel);
      });

      it('returns apiProvider', () => {
        expect(result?.apiProvider).toBe(apiProvider);
      });

      it('returns apiUrl', () => {
        expect(result?.apiUrl).toBe(connector.config.apiUrl);
      });

      it('returns defaultModel from config', () => {
        expect(result?.defaultModel).toBe(defaultModel);
      });
    });
  });

  describe('when connector config is undefined', () => {
    let result: ReturnType<typeof getGenAiConfig>;

    beforeEach(() => {
      const connectorWithoutConfig = omit('config', connector) as unknown as ActionConnector<
        Record<string, unknown>,
        Record<string, unknown>
      >;
      result = getGenAiConfig(connectorWithoutConfig);
    });

    it('returns undefined apiProvider', () => {
      expect(result?.apiProvider).toBeUndefined();
    });

    it('returns undefined apiUrl', () => {
      expect(result?.apiUrl).toBeUndefined();
    });

    it('returns undefined defaultModel', () => {
      expect(result?.defaultModel).toBeUndefined();
    });
  });
});

describe('getRequestBody', () => {
  const alertsIndexPattern = 'test-index-pattern';
  const anonymizationFields = {
    data: [
      {
        field: 'field1',
        id: '1',
      },
      {
        field: 'field2',
        id: '2',
      },
    ],
    page: 1,
    perPage: 10,
    total: 100,
  };

  const traceOptions = {
    apmUrl: '/app/apm',
    langSmithApiKey: '',
    langSmithProject: '',
  };

  describe('with basic parameters', () => {
    let result: ReturnType<typeof getRequestBody>;

    beforeEach(() => {
      result = getRequestBody({
        alertsIndexPattern,
        anonymizationFields,
        size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
        traceOptions,
      });
    });

    it('returns alertsIndexPattern', () => {
      expect(result.alertsIndexPattern).toBe(alertsIndexPattern);
    });

    it('returns anonymizationFields data', () => {
      expect(result.anonymizationFields).toEqual(anonymizationFields.data);
    });

    it('returns empty apiConfig connectorId', () => {
      expect(result.apiConfig.connectorId).toBe('');
    });

    it('returns empty apiConfig actionTypeId', () => {
      expect(result.apiConfig.actionTypeId).toBe('');
    });

    it('returns undefined apiConfig model', () => {
      expect(result.apiConfig.model).toBeUndefined();
    });

    it('returns undefined apiConfig provider', () => {
      expect(result.apiConfig.provider).toBeUndefined();
    });

    it('returns undefined langSmithProject', () => {
      expect(result.langSmithProject).toBeUndefined();
    });

    it('returns undefined langSmithApiKey', () => {
      expect(result.langSmithApiKey).toBeUndefined();
    });

    it('returns empty replacements object', () => {
      expect(result.replacements).toEqual({});
    });

    it('returns correct size', () => {
      expect(result.size).toBe(DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS);
    });

    it('returns invokeAI subAction', () => {
      expect(result.subAction).toBe('invokeAI');
    });
  });

  describe('when alertsIndexPattern is undefined', () => {
    it('returns empty string for alertsIndexPattern', () => {
      const result = getRequestBody({
        alertsIndexPattern: undefined,
        anonymizationFields,
        size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
        traceOptions,
      });

      expect(result.alertsIndexPattern).toBe('');
    });
  });

  describe('when LangSmith details are provided', () => {
    const withLangSmith = {
      alertsIndexPattern,
      anonymizationFields,
      connectorId: connector.id,
      size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
      traceOptions: {
        apmUrl: '/app/apm',
        langSmithApiKey: 'an API key',
        langSmithProject: 'A project',
      },
    };
    let result: ReturnType<typeof getRequestBody>;

    beforeEach(() => {
      result = getRequestBody(withLangSmith);
    });

    it('returns langSmithProject', () => {
      expect(result.langSmithProject).toBe(withLangSmith.traceOptions.langSmithProject);
    });

    it('returns langSmithApiKey', () => {
      expect(result.langSmithApiKey).toBe(withLangSmith.traceOptions.langSmithApiKey);
    });
  });

  describe('when selectedConnector is provided', () => {
    let result: ReturnType<typeof getRequestBody>;

    beforeEach(() => {
      result = getRequestBody({
        alertsIndexPattern,
        anonymizationFields,
        selectedConnector: connector,
        size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
        traceOptions,
      });
    });

    it('returns connector actionTypeId', () => {
      expect(result.apiConfig.actionTypeId).toBe(connector.actionTypeId);
    });

    it('returns connector id as connectorId', () => {
      expect(result.apiConfig.connectorId).toBe(connector.id);
    });
  });

  describe('when genAiConfig is provided', () => {
    const genAiConfig = {
      apiProvider: OpenAiProviderType.AzureAi,
      defaultModel: '2024-02-15-preview',
    };
    let result: ReturnType<typeof getRequestBody>;

    beforeEach(() => {
      result = getRequestBody({
        alertsIndexPattern,
        anonymizationFields,
        genAiConfig,
        selectedConnector: connector,
        size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
        traceOptions,
      });
    });

    it('returns genAiConfig defaultModel as model', () => {
      expect(result.apiConfig.model).toBe(genAiConfig.defaultModel);
    });

    it('returns genAiConfig apiProvider as provider', () => {
      expect(result.apiConfig.provider).toBe(genAiConfig.apiProvider);
    });
  });
});

describe('getWorkflowConfig', () => {
  const mockGetWorkflowSettings = workflowConfigModule.getWorkflowSettings as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with custom workflow configuration', () => {
    const mockSettings = {
      alertRetrievalWorkflowIds: ['workflow-1', 'workflow-2'],
      defaultAlertRetrievalMode: 'disabled' as const,
      validationWorkflowId: 'custom-validation',
    };
    let result: ReturnType<typeof getWorkflowConfig>;

    beforeEach(() => {
      mockGetWorkflowSettings.mockReturnValue(mockSettings);
      result = getWorkflowConfig('test-space');
    });

    it('calls getWorkflowSettings with spaceId', () => {
      expect(mockGetWorkflowSettings).toHaveBeenCalledWith('test-space');
    });

    it('returns alert_retrieval_workflow_ids', () => {
      expect(result.alert_retrieval_workflow_ids).toEqual(['workflow-1', 'workflow-2']);
    });

    it('returns default_alert_retrieval_mode', () => {
      expect(result.default_alert_retrieval_mode).toBe('disabled');
    });

    it('returns validation_workflow_id', () => {
      expect(result.validation_workflow_id).toBe('custom-validation');
    });
  });

  describe('with default configuration', () => {
    const defaultSettings = {
      alertRetrievalWorkflowIds: [],
      defaultAlertRetrievalMode: 'custom_query' as const,
      validationWorkflowId: 'default',
    };
    let result: ReturnType<typeof getWorkflowConfig>;

    beforeEach(() => {
      mockGetWorkflowSettings.mockReturnValue(defaultSettings);
      result = getWorkflowConfig('test-space');
    });

    it('returns empty alert_retrieval_workflow_ids', () => {
      expect(result.alert_retrieval_workflow_ids).toEqual([]);
    });

    it('returns default_alert_retrieval_mode as custom_query', () => {
      expect(result.default_alert_retrieval_mode).toBe('custom_query');
    });

    it('returns default validation_workflow_id', () => {
      expect(result.validation_workflow_id).toBe('default');
    });
  });

  describe('with esql configuration', () => {
    const esqlSettings = {
      alertRetrievalWorkflowIds: [],
      defaultAlertRetrievalMode: 'esql' as const,
      esqlQuery: 'FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == "high"',
      validationWorkflowId: 'default',
    };
    let result: ReturnType<typeof getWorkflowConfig>;

    beforeEach(() => {
      mockGetWorkflowSettings.mockReturnValue(esqlSettings);
      result = getWorkflowConfig('test-space');
    });

    it('returns default_alert_retrieval_mode as esql', () => {
      expect(result.default_alert_retrieval_mode).toBe('esql');
    });

    it('returns esql_query', () => {
      expect(result.esql_query).toBe(esqlSettings.esqlQuery);
    });
  });

  describe('without esqlQuery', () => {
    it('does not include esql_query in the result', () => {
      const mockSettings = {
        alertRetrievalWorkflowIds: [],
        defaultAlertRetrievalMode: 'custom_query' as const,
        validationWorkflowId: 'default',
      };
      mockGetWorkflowSettings.mockReturnValue(mockSettings);

      const result = getWorkflowConfig('test-space');

      expect(result).not.toHaveProperty('esql_query');
    });
  });

  describe('property name mapping', () => {
    let result: ReturnType<typeof getWorkflowConfig>;

    beforeEach(() => {
      const mockSettings = {
        alertRetrievalWorkflowIds: ['workflow-1'],
        defaultAlertRetrievalMode: 'custom_query' as const,
        validationWorkflowId: 'default',
      };
      mockGetWorkflowSettings.mockReturnValue(mockSettings);
      result = getWorkflowConfig('another-space');
    });

    it('has alert_retrieval_workflow_ids property', () => {
      expect(result).toHaveProperty('alert_retrieval_workflow_ids');
    });

    it('has default_alert_retrieval_mode property', () => {
      expect(result).toHaveProperty('default_alert_retrieval_mode');
    });

    it('has validation_workflow_id property', () => {
      expect(result).toHaveProperty('validation_workflow_id');
    });

    it('does not have alertRetrievalWorkflowIds property', () => {
      expect(result).not.toHaveProperty('alertRetrievalWorkflowIds');
    });

    it('does not have defaultAlertRetrievalMode property', () => {
      expect(result).not.toHaveProperty('defaultAlertRetrievalMode');
    });

    it('does not have validationWorkflowId property', () => {
      expect(result).not.toHaveProperty('validationWorkflowId');
    });
  });
});

describe('callInternalGenerateApi', () => {
  const mockGetWorkflowSettings = workflowConfigModule.getWorkflowSettings as jest.Mock;
  let mockHttp: HttpSetup;

  const defaultParams = {
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: {
      actionTypeId: '.gen-ai',
      connectorId: 'test-connector-id',
      model: 'gpt-4',
    },
    http: {} as HttpSetup,
    size: 150,
    spaceId: 'test-space',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = {
      post: jest.fn(),
    } as unknown as HttpSetup;
  });

  describe('with valid parameters', () => {
    beforeEach(() => {
      const mockSettings = {
        alertRetrievalWorkflowIds: ['workflow-1'],
        defaultAlertRetrievalMode: 'custom_query' as const,
        validationWorkflowId: 'default',
      };
      mockGetWorkflowSettings.mockReturnValue(mockSettings);
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue({
        attack_discoveries: null,
        execution_uuid: '12345678-1234-5678-9abc-123456789012',
        replacements: {},
      });
    });

    it('calls internal API endpoint', async () => {
      await callInternalGenerateApi({ ...defaultParams, http: mockHttp });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/internal/attack_discovery/_generate',
        expect.any(Object)
      );
    });

    it('calls internal API with version 1', async () => {
      await callInternalGenerateApi({ ...defaultParams, http: mockHttp });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { version?: string };

      expect(options?.version).toBe('1');
    });

    it('calls internal API with stringified body', async () => {
      await callInternalGenerateApi({ ...defaultParams, http: mockHttp });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: unknown };

      expect(typeof options?.body).toBe('string');
    });

    it('returns request body without alerts', async () => {
      const mockPost = mockHttp.post as jest.Mock;

      await callInternalGenerateApi({ ...defaultParams, http: mockHttp });

      const options = mockPost.mock.calls[0]?.[1] as { body?: string };
      const requestBody = JSON.parse(options?.body ?? '{}');

      expect(requestBody.alerts).toBeUndefined();
    });
  });

  describe('workflow configuration in request body', () => {
    const mockSettings = {
      alertRetrievalWorkflowIds: ['workflow-1', 'workflow-2'],
      defaultAlertRetrievalMode: 'disabled' as const,
      validationWorkflowId: 'custom-validation',
    };

    beforeEach(() => {
      mockGetWorkflowSettings.mockReturnValue(mockSettings);
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue({
        attack_discoveries: null,
        execution_uuid: '12345678-1234-5678-9abc-123456789012',
        replacements: {},
      });
    });

    it('includes alert_retrieval_workflow_ids', async () => {
      await callInternalGenerateApi({ ...defaultParams, http: mockHttp });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.workflow_config.alert_retrieval_workflow_ids).toEqual([
        'workflow-1',
        'workflow-2',
      ]);
    });

    it('includes default_alert_retrieval_mode', async () => {
      await callInternalGenerateApi({ ...defaultParams, http: mockHttp });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.workflow_config.default_alert_retrieval_mode).toBe('disabled');
    });

    it('includes validation_workflow_id', async () => {
      await callInternalGenerateApi({ ...defaultParams, http: mockHttp });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.workflow_config.validation_workflow_id).toBe('custom-validation');
    });
  });

  describe('when spaceId is null', () => {
    beforeEach(() => {
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue({
        attack_discoveries: null,
        execution_uuid: '12345678-1234-5678-9abc-123456789012',
        replacements: {},
      });
    });

    it('uses empty array for alert_retrieval_workflow_ids', async () => {
      await callInternalGenerateApi({
        ...defaultParams,
        http: mockHttp,
        spaceId: null,
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.workflow_config.alert_retrieval_workflow_ids).toEqual([]);
    });

    it('uses custom_query for default_alert_retrieval_mode', async () => {
      await callInternalGenerateApi({
        ...defaultParams,
        http: mockHttp,
        spaceId: null,
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.workflow_config.default_alert_retrieval_mode).toBe('custom_query');
    });

    it('uses default for validation_workflow_id', async () => {
      await callInternalGenerateApi({
        ...defaultParams,
        http: mockHttp,
        spaceId: null,
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.workflow_config.validation_workflow_id).toBe('default');
    });
  });

  describe('with optional parameters', () => {
    beforeEach(() => {
      const mockSettings = {
        alertRetrievalWorkflowIds: [],
        defaultAlertRetrievalMode: 'custom_query' as const,
        validationWorkflowId: 'default',
      };
      mockGetWorkflowSettings.mockReturnValue(mockSettings);
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue({
        attack_discoveries: null,
        execution_uuid: '12345678-1234-5678-9abc-123456789012',
        replacements: {},
      });
    });

    it('includes end parameter', async () => {
      await callInternalGenerateApi({
        ...defaultParams,
        end: '2024-01-15T12:00:00Z',
        http: mockHttp,
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.end).toBe('2024-01-15T12:00:00Z');
    });

    it('includes start parameter', async () => {
      await callInternalGenerateApi({
        ...defaultParams,
        http: mockHttp,
        start: '2024-01-14T12:00:00Z',
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.start).toBe('2024-01-14T12:00:00Z');
    });

    it('includes filter parameter', async () => {
      const filter = { term: { 'kibana.alert.severity': 'high' } };

      await callInternalGenerateApi({
        ...defaultParams,
        filter,
        http: mockHttp,
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };
      const requestBody = JSON.parse(options?.body as string);

      expect(requestBody.filter).toEqual(filter);
    });
  });

  describe('error handling', () => {
    it('throws error when response parsing fails', async () => {
      const mockSettings = {
        alertRetrievalWorkflowIds: [],
        defaultAlertRetrievalMode: 'custom_query' as const,
        validationWorkflowId: 'default',
      };
      mockGetWorkflowSettings.mockReturnValue(mockSettings);
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue({
        invalid: 'response',
      });

      await expect(callInternalGenerateApi({ ...defaultParams, http: mockHttp })).rejects.toThrow(
        'Failed to parse internal API response'
      );
    });
  });
});

describe('callPublicGenerateApi', () => {
  let mockHttp: HttpSetup;

  const defaultBody = {
    alertsIndexPattern: '.alerts-security.alerts-default',
    anonymizationFields: [],
    apiConfig: {
      actionTypeId: '.gen-ai',
      connectorId: 'test-connector-id',
    },
    replacements: {},
    size: 150,
    subAction: 'invokeAI' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = {
      post: jest.fn(),
    } as unknown as HttpSetup;
  });

  describe('with valid parameters', () => {
    beforeEach(() => {
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue({
        execution_uuid: '12345678-1234-5678-9abc-123456789012',
      });
    });

    it('calls public API endpoint', async () => {
      await callPublicGenerateApi({
        body: defaultBody,
        http: mockHttp,
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/api/attack_discovery/_generate',
        expect.any(Object)
      );
    });

    it('calls public API with stringified body', async () => {
      await callPublicGenerateApi({
        body: defaultBody,
        http: mockHttp,
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { body?: string };

      expect(options?.body).toBe(JSON.stringify(defaultBody));
    });

    it('calls public API with version 1', async () => {
      await callPublicGenerateApi({
        body: defaultBody,
        http: mockHttp,
      });

      const mockPost = mockHttp.post as jest.MockedFunction<typeof mockHttp.post>;
      // @ts-expect-error - mock.calls type is incorrect, runtime uses two-argument form
      const options = mockPost.mock.calls[0][1] as unknown as { version?: string };

      expect(options?.version).toBe('2023-10-31');
    });
  });

  describe('response handling', () => {
    it('returns response when parsing succeeds', async () => {
      const mockResponse = { execution_uuid: '12345678-1234-1234-1234-123456789012' };
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue(mockResponse);

      const result = await callPublicGenerateApi({
        body: defaultBody,
        http: mockHttp,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('throws error when response parsing fails', async () => {
      (mockHttp.post as jest.MockedFunction<typeof mockHttp.post>).mockResolvedValue({
        invalid: 'response',
      });

      await expect(
        callPublicGenerateApi({
          body: defaultBody,
          http: mockHttp,
        })
      ).rejects.toThrow('Failed to parse the response');
    });
  });
});

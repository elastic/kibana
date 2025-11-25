/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { ENTITY_RISK_SCORE_TOOL } from './entity_risk_score';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import type { ElasticAssistantApiRequestHandlerContext } from '@kbn/elastic-assistant-plugin/server/types';

const MAX_SIZE = 10000;

const mockRiskScore = [
  {
    '@timestamp': '2023-01-01T00:00:00.000Z',
    calculated_level: 'High',
    calculated_score_norm: 85.5,
    id_field: 'host.name',
    id_value: 'test-host',
    inputs: [
      {
        id: 'alert-1',
        risk_score: 75,
        contribution_score: 0.8,
        category: 'malware',
      },
      {
        id: 'alert-2',
        risk_score: 65,
        contribution_score: 0.6,
        category: 'network',
      },
    ],
  },
];

const mockAlerts = {
  'alert-1': {
    '@timestamp': ['2023-01-01T00:00:00.000Z'],
    'kibana.alert.rule.name': ['Malware Detection'],
    'host.name': ['test-host'],
  },
  'alert-2': {
    '@timestamp': ['2023-01-01T00:00:00.000Z'],
    'kibana.alert.rule.name': ['Network Anomaly'],
    'host.name': ['test-host'],
  },
};

const mockGetRiskScores = jest.fn().mockResolvedValue(undefined);
const mockGetAlertsById = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../lib/entity_analytics/risk_score/get_risk_score', () => ({
  createGetRiskScores: () => (params: unknown) => mockGetRiskScores(params),
}));

jest.mock('./get_alert_by_id', () => ({
  createGetAlertsById: () => () => mockGetAlertsById(),
}));

describe('ENTITY_RISK_SCORE_TOOL', () => {
  const alertsIndexPattern = 'alerts-index';
  const esClient = {
    search: jest.fn().mockResolvedValue({}),
  } as unknown as ElasticsearchClient;
  const replacements = { key: 'value' };
  const anonymizationFields = [
    { id: '@timestamp', field: '@timestamp', allowed: true, anonymized: false },
    { id: 'host.name', field: 'host.name', allowed: true, anonymized: true },
    {
      id: 'kibana.alert.rule.name',
      field: 'kibana.alert.rule.name',
      allowed: true,
      anonymized: false,
    },
  ];

  const request = {
    body: {
      isEnabledKnowledgeBase: false,
      alertsIndexPattern: '.alerts-security.alerts-default',
      replacements,
      size: 20,
      anonymizationFields,
    },
  } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const isEnabledKnowledgeBase = true;
  const logger = loggerMock.create();
  const contentReferencesStore = newContentReferencesStoreMock();
  const assistantContext = {
    getSpaceId: jest.fn().mockReturnValue('default'),
  } as unknown as ElasticAssistantApiRequestHandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultParams: AssistantToolParams = {
    alertsIndexPattern,
    esClient,
    request,
    isEnabledKnowledgeBase,
    logger,
    contentReferencesStore,
    assistantContext,
    size: 20,
    anonymizationFields,
    onNewReplacements: jest.fn(),
  };

  describe('isSupported', () => {
    it('returns false when alertsIndexPattern is undefined', () => {
      const params = {
        ...defaultParams,
        alertsIndexPattern: undefined,
      };

      expect(ENTITY_RISK_SCORE_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when the request is missing required anonymization parameters', () => {
      const requestMissingAnonymizationParams = {
        body: {
          isEnabledKnowledgeBase: false,
          alertsIndexPattern: '.alerts-security.alerts-default',
          size: 20,
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
      const params = {
        ...defaultParams,
        request: requestMissingAnonymizationParams,
      };

      expect(ENTITY_RISK_SCORE_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when size is undefined', () => {
      const params = {
        ...defaultParams,
        size: undefined,
      };

      expect(ENTITY_RISK_SCORE_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when size is out of range', () => {
      const params = {
        ...defaultParams,
        size: MAX_SIZE + 1,
      };

      expect(ENTITY_RISK_SCORE_TOOL.isSupported(params)).toBe(false);
    });

    it('returns true when all required parameters are provided', () => {
      expect(ENTITY_RISK_SCORE_TOOL.isSupported(defaultParams)).toBe(true);
    });
  });

  describe('getTool', () => {
    it('returns null when alertsIndexPattern is undefined', async () => {
      const tool = await ENTITY_RISK_SCORE_TOOL.getTool({
        ...defaultParams,
        alertsIndexPattern: undefined,
      });

      expect(tool).toBeNull();
    });

    it('returns null when size is undefined', async () => {
      const tool = await ENTITY_RISK_SCORE_TOOL.getTool({
        ...defaultParams,
        size: undefined,
      });

      expect(tool).toBeNull();
    });

    it('returns null when size is out of range', async () => {
      const tool = await ENTITY_RISK_SCORE_TOOL.getTool({
        ...defaultParams,
        size: MAX_SIZE + 1,
      });

      expect(tool).toBeNull();
    });

    it('returns a tool instance with the expected name and description', async () => {
      const tool = (await ENTITY_RISK_SCORE_TOOL.getTool(defaultParams)) as DynamicStructuredTool;

      expect(tool.name).toEqual('EntityRiskScoreTool');
      expect(tool.description).toContain('entity risk score');
      expect(tool.tags).toEqual(['entity-risk-score', 'entities']);
    });

    it('returns risk score data when entity exists', async () => {
      mockGetRiskScores.mockResolvedValue(mockRiskScore);
      mockGetAlertsById.mockResolvedValue(mockAlerts);

      const tool = (await ENTITY_RISK_SCORE_TOOL.getTool(defaultParams)) as DynamicStructuredTool;

      const result = await tool.func({
        identifier_type: 'host',
        identifier: 'test-host',
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.riskScore).toBeDefined();
      expect(parsedResult.riskScore.calculated_score_norm).toBe(85.5);
      expect(parsedResult.riskScore.calculated_level).toBe('High');
      expect(parsedResult.riskScore.inputs).toHaveLength(2);
      expect(parsedResult.riskScore.id_value).toBe('test-host');
    });

    it('returns "No risk score found" message when entity does not exist', async () => {
      mockGetRiskScores.mockReturnValue([]);

      const tool = (await ENTITY_RISK_SCORE_TOOL.getTool(defaultParams)) as DynamicStructuredTool;

      const result = await tool.func({
        identifier_type: 'host',
        identifier: 'non-existent-host',
      });

      expect(result).toBe('No risk score found for the specified entity.');
    });

    it('enhances inputs with alert data', async () => {
      mockGetRiskScores.mockResolvedValue(mockRiskScore);
      mockGetAlertsById.mockResolvedValue(mockAlerts);

      const tool = (await ENTITY_RISK_SCORE_TOOL.getTool(defaultParams)) as DynamicStructuredTool;

      const result = await tool.func({
        identifier_type: 'host',
        identifier: 'test-host',
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.riskScore.inputs[0]).toHaveProperty('alert_contribution');
      expect(parsedResult.riskScore.inputs[0].alert_contribution).toContain('@timestamp');
      expect(parsedResult.riskScore.inputs[0].alert_contribution).toContain('host.name');
      expect(parsedResult.riskScore.inputs[0].alert_contribution).toContain(
        'kibana.alert.rule.name'
      );
    });

    it('includes replacements in the response', async () => {
      mockGetRiskScores.mockResolvedValue(mockRiskScore);
      mockGetAlertsById.mockResolvedValue(mockAlerts);

      const tool = (await ENTITY_RISK_SCORE_TOOL.getTool(defaultParams)) as DynamicStructuredTool;

      const result = await tool.func({
        identifier_type: 'host',
        identifier: 'test-host',
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.replacements).toBeDefined();
      expect(Object.values(parsedResult.replacements)).toEqual(['test-host']);
    });

    it('deanonymizes the entity identifier before searching and returns anonymized data.', async () => {
      const anonymizedIdentifier = 'anonymized-host';
      const entityIdentifier = 'test-host';
      mockGetRiskScores.mockResolvedValue(mockRiskScore);
      mockGetAlertsById.mockResolvedValue(mockAlerts);

      const tool = (await ENTITY_RISK_SCORE_TOOL.getTool({
        ...defaultParams,
        replacements: {
          [anonymizedIdentifier]: entityIdentifier,
        },
      })) as DynamicStructuredTool;

      const result = await tool.func({
        identifier_type: 'host',
        identifier: anonymizedIdentifier,
      });

      expect(mockGetRiskScores).toHaveBeenCalledWith(
        expect.objectContaining({
          entityIdentifier,
        })
      );

      // ensure the response contains the anonymized data
      const parsedResult = JSON.parse(result);
      expect(parsedResult.riskScore.inputs[0].alert_contribution).toContain(anonymizedIdentifier);
      expect(parsedResult.riskScore.id_value).toBe(anonymizedIdentifier);
    });
  });
});

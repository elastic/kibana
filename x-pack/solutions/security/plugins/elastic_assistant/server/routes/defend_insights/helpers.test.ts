/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import moment from 'moment';

import {
  ContentReferencesStore,
  DEFEND_INSIGHTS_TOOL_ID,
  DefendInsightStatus,
  DefendInsightType,
} from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import {
  DEFEND_INSIGHT_ERROR_EVENT,
  DEFEND_INSIGHT_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import {
  getAssistantTool,
  getAssistantToolParams,
  handleToolError,
  updateDefendInsights,
  updateDefendInsightLastViewedAt,
} from './helpers';

describe('defend insights route helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAssistantTool', () => {
    it('should return the defend-insights tool', () => {
      const getRegisteredTools = jest.fn().mockReturnValue([{ id: DEFEND_INSIGHTS_TOOL_ID }]);
      const result = getAssistantTool(getRegisteredTools, 'pluginName');
      expect(result).toEqual({ id: DEFEND_INSIGHTS_TOOL_ID });
    });
  });

  describe('getAssistantToolParams', () => {
    it('should return the correct tool params', () => {
      const params = {
        endpointIds: ['endpoint-id1'],
        insightType: DefendInsightType.Enum.incompatible_antivirus,
        actionsClient: {} as any,
        anonymizationFields: [],
        apiConfig: { connectorId: 'connector-id1', actionTypeId: 'action-type-id1' },
        esClient: {} as any,
        connectorTimeout: 1000,
        langChainTimeout: 1000,
        langSmithProject: 'project',
        langSmithApiKey: 'apiKey',
        logger: {} as any,
        latestReplacements: {},
        onNewReplacements: jest.fn(),
        request: {} as any,
        contentReferencesStore: {} as ContentReferencesStore,
      };
      const result = getAssistantToolParams(params);

      expect(result).toHaveProperty('endpointIds', params.endpointIds);
      expect(result).toHaveProperty('insightType', params.insightType);
      expect(result).toHaveProperty('llm');
    });
  });

  describe('handleToolError', () => {
    it('should handle tool error and update defend insight', async () => {
      const params = {
        apiConfig: {
          connectorId: 'connector-id1',
          actionTypeId: 'action-type-id1',
          model: 'model',
          provider: OpenAiProviderType.OpenAi,
        },
        defendInsightId: 'id',
        authenticatedUser: {} as any,
        dataClient: {
          getDefendInsight: jest.fn().mockResolvedValueOnce({
            status: DefendInsightStatus.Enum.running,
            backingIndex: 'index',
          }),
          updateDefendInsight: jest.fn(),
        } as any,
        err: new Error('error'),
        latestReplacements: {},
        logger: { error: jest.fn() } as any,
        telemetry: { reportEvent: jest.fn() } as any,
      };
      await handleToolError(params);

      expect(params.dataClient.updateDefendInsight).toHaveBeenCalledTimes(1);
      expect(params.telemetry.reportEvent).toHaveBeenCalledWith(
        DEFEND_INSIGHT_ERROR_EVENT.eventType,
        expect.any(Object)
      );
    });
  });

  describe('updateDefendInsights', () => {
    it('should update defend insights', async () => {
      const params = {
        apiConfig: {
          connectorId: 'connector-id1',
          actionTypeId: 'action-type-id1',
          model: 'model',
          provider: OpenAiProviderType.OpenAi,
        },
        defendInsightId: 'insight-id1',
        authenticatedUser: {} as any,
        dataClient: {
          getDefendInsight: jest.fn().mockResolvedValueOnce({
            status: DefendInsightStatus.Enum.running,
            backingIndex: 'backing-index-name',
            generationIntervals: [],
          }),
          updateDefendInsight: jest.fn(),
        } as any,
        latestReplacements: {},
        logger: { error: jest.fn() } as any,
        rawDefendInsights: '{"eventsContextCount": 5, "insights": ["insight1", "insight2"]}',
        startTime: moment(),
        telemetry: { reportEvent: jest.fn() } as any,
      };
      await updateDefendInsights(params);

      expect(params.dataClient.getDefendInsight).toHaveBeenCalledTimes(1);
      expect(params.dataClient.getDefendInsight).toHaveBeenCalledWith({
        id: params.defendInsightId,
        authenticatedUser: params.authenticatedUser,
      });
      expect(params.dataClient.updateDefendInsight).toHaveBeenCalledTimes(1);
      expect(params.dataClient.updateDefendInsight).toHaveBeenCalledWith({
        defendInsightUpdateProps: {
          eventsContextCount: 5,
          insights: ['insight1', 'insight2'],
          status: DefendInsightStatus.Enum.succeeded,
          generationIntervals: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              durationMs: expect.any(Number),
            }),
          ]),
          id: params.defendInsightId,
          replacements: params.latestReplacements,
          backingIndex: 'backing-index-name',
        },
        authenticatedUser: params.authenticatedUser,
      });
      expect(params.telemetry.reportEvent).toHaveBeenCalledWith(
        DEFEND_INSIGHT_SUCCESS_EVENT.eventType,
        expect.any(Object)
      );
    });

    it('should handle error if rawDefendInsights is null', async () => {
      const params = {
        apiConfig: {
          connectorId: 'connector-id1',
          actionTypeId: 'action-type-id1',
          model: 'model',
          provider: OpenAiProviderType.OpenAi,
        },
        defendInsightId: 'id',
        authenticatedUser: {} as any,
        dataClient: {
          getDefendInsight: jest.fn().mockResolvedValueOnce({
            status: DefendInsightStatus.Enum.running,
            backingIndex: 'index',
            generationIntervals: [],
          }),
          updateDefendInsight: jest.fn(),
        } as any,
        latestReplacements: {},
        logger: { error: jest.fn() } as any,
        rawDefendInsights: null,
        startTime: moment(),
        telemetry: { reportEvent: jest.fn() } as any,
      };
      await updateDefendInsights(params);

      expect(params.logger.error).toHaveBeenCalledTimes(1);
      expect(params.telemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(params.telemetry.reportEvent).toHaveBeenCalledWith(
        DEFEND_INSIGHT_ERROR_EVENT.eventType,
        expect.any(Object)
      );
    });
  });

  describe('updateDefendInsightLastViewedAt', () => {
    it('should update lastViewedAt time', async () => {
      // ensure difference regardless of processing speed
      const startTime = new Date().getTime() - 1;
      const insightId = 'defend-insight-id1';
      const backingIndex = 'backing-index';
      const params = {
        id: insightId,
        authenticatedUser: {} as any,
        dataClient: {
          findDefendInsightsByParams: jest
            .fn()
            .mockResolvedValueOnce([{ id: insightId, backingIndex }]),
          updateDefendInsights: jest.fn().mockResolvedValueOnce([{ id: insightId }]),
        } as any,
      };
      const result = await updateDefendInsightLastViewedAt(params);

      expect(params.dataClient.findDefendInsightsByParams).toHaveBeenCalledTimes(1);
      expect(params.dataClient.findDefendInsightsByParams).toHaveBeenCalledWith({
        params: { ids: [insightId] },
        authenticatedUser: params.authenticatedUser,
      });
      expect(params.dataClient.updateDefendInsights).toHaveBeenCalledTimes(1);
      expect(params.dataClient.updateDefendInsights).toHaveBeenCalledWith({
        defendInsightsUpdateProps: [
          expect.objectContaining({
            id: insightId,
            backingIndex,
          }),
        ],
        authenticatedUser: params.authenticatedUser,
      });
      expect(
        new Date(
          params.dataClient.updateDefendInsights.mock.calls[0][0].defendInsightsUpdateProps[0].lastViewedAt
        ).getTime()
      ).toBeGreaterThan(startTime);
      expect(result).toEqual({ id: insightId });
    });

    it('should return undefined if defend insight not found', async () => {
      const insightId = 'defend-insight-id1';
      const params = {
        id: insightId,
        authenticatedUser: {} as any,
        dataClient: {
          findDefendInsightsByParams: jest.fn().mockResolvedValueOnce([]),
          updateDefendInsight: jest.fn(),
        } as any,
      };
      const result = await updateDefendInsightLastViewedAt(params);

      expect(params.dataClient.findDefendInsightsByParams).toHaveBeenCalledTimes(1);
      expect(params.dataClient.findDefendInsightsByParams).toHaveBeenCalledWith({
        params: { ids: [insightId] },
        authenticatedUser: params.authenticatedUser,
      });
      expect(result).toBeUndefined();
    });
  });
});

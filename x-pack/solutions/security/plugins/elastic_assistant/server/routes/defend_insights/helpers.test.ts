/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Document } from '@langchain/core/documents';
import type { DefendInsights } from '@kbn/elastic-assistant-common';
import moment from 'moment';
import {
  ContentReferencesStore,
  DEFEND_INSIGHTS_ID,
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
  runExternalCallbacks,
} from './helpers';
import { appContextService } from '../../services/app_context';

jest.mock('../../services/app_context', () => ({
  appContextService: {
    getRegisteredCallbacks: jest.fn(),
  },
}));

describe('defend insights route helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAssistantTool', () => {
    it('should return the defend-insights tool', () => {
      const getRegisteredTools = jest.fn().mockReturnValue([{ id: DEFEND_INSIGHTS_ID }]);
      const result = getAssistantTool(getRegisteredTools, 'pluginName');
      expect(result).toEqual({ id: DEFEND_INSIGHTS_ID });
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
        anonymizedEvents: [{}, {}, {}, {}, {}] as any as Document[],
        apiConfig: {
          connectorId: 'connector-id1',
          actionTypeId: 'action-type-id1',
          model: 'model',
          provider: OpenAiProviderType.OpenAi,
        },
        defendInsightId: 'insight-id1',
        insights: ['insight1', 'insight2'] as any as DefendInsights,
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
        insightType: DefendInsightType.Enum.incompatible_antivirus,
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
  });

  describe('updateDefendInsightLastViewedAt', () => {
    it('should update lastViewedAt time for a single insight', async () => {
      // ensure difference regardless of processing speed
      const startTime = new Date().getTime() - 1;
      const insightId = 'defend-insight-id1';
      const backingIndex = 'backing-index';

      const insight: any = {
        id: insightId,
        backingIndex,
      };

      const params = {
        defendInsights: [insight],
        authenticatedUser: {} as any,
        dataClient: {
          updateDefendInsights: jest.fn().mockResolvedValueOnce([{ id: insightId }]),
        } as any,
      };

      const result = await updateDefendInsightLastViewedAt(params);

      expect(params.dataClient.updateDefendInsights).toHaveBeenCalledTimes(1);
      expect(params.dataClient.updateDefendInsights).toHaveBeenCalledWith({
        defendInsightsUpdateProps: [
          expect.objectContaining({
            id: insightId,
            backingIndex,
            lastViewedAt: expect.any(String),
          }),
        ],
        authenticatedUser: params.authenticatedUser,
      });

      const updatedAt = new Date(
        params.dataClient.updateDefendInsights.mock.calls[0][0].defendInsightsUpdateProps[0].lastViewedAt
      ).getTime();
      expect(updatedAt).toBeGreaterThan(startTime);

      expect(result).toEqual({ id: insightId });
    });

    it('should return undefined if no insights were provided', async () => {
      const params = {
        defendInsights: [],
        authenticatedUser: {} as any,
        dataClient: {
          updateDefendInsights: jest.fn(),
        } as any,
      };

      const result = await updateDefendInsightLastViewedAt(params);

      expect(params.dataClient.updateDefendInsights).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('runExternalCallbacks', () => {
    it('should call all registered callbacks with provided arguments', async () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const mockRequest = {} as any;

      (appContextService.getRegisteredCallbacks as jest.Mock).mockReturnValue([
        mockCallback1,
        mockCallback2,
      ]);

      await runExternalCallbacks('some-callback-id' as any, mockRequest);

      expect(mockCallback1).toHaveBeenCalledWith(mockRequest);
      expect(mockCallback2).toHaveBeenCalledWith(mockRequest);
    });

    it('should support callbacks with two arguments', async () => {
      const mockCallback = jest.fn();
      const mockRequest = {} as any;
      const mockArg = { extra: true };

      (appContextService.getRegisteredCallbacks as jest.Mock).mockReturnValue([mockCallback]);

      await runExternalCallbacks('some-callback-id' as any, mockRequest, mockArg);

      expect(mockCallback).toHaveBeenCalledWith(mockRequest, mockArg);
    });

    it('should handle empty callback list gracefully', async () => {
      const mockRequest = {} as any;

      (appContextService.getRegisteredCallbacks as jest.Mock).mockReturnValue([]);

      await expect(
        runExternalCallbacks('some-callback-id' as any, mockRequest)
      ).resolves.not.toThrow();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Document } from '@langchain/core/documents';
import type { DefendInsights, ContentReferencesStore } from '@kbn/elastic-assistant-common';
import moment from 'moment';
import {
  DEFEND_INSIGHTS_ID,
  DefendInsightStatus,
  DefendInsightType,
} from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/connector-schemas/openai/constants';

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

vi.mock('../../services/app_context', () => {
      const mocked = {
      appContextService: {
        getRegisteredCallbacks: vi.fn(),
      },
    };
      return { ...mocked, default: mocked };
    });

describe('defend insights route helpers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAssistantTool', () => {
    it('should return the defend-insights tool', () => {
      const getRegisteredTools = vi.fn().mockReturnValue([{ id: DEFEND_INSIGHTS_ID }]);
      const result = getAssistantTool(getRegisteredTools, 'pluginName');
      expect(result).toEqual({ id: DEFEND_INSIGHTS_ID });
    });
  });

  describe('getAssistantToolParams', () => {
    it('should return the correct tool params', () => {
      const params = {
        endpointIds: ['endpoint-id1'],
        insightType: DefendInsightType.enum.incompatible_antivirus,
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
        onNewReplacements: vi.fn(),
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
          getDefendInsight: vi.fn().mockResolvedValueOnce({
            status: DefendInsightStatus.enum.running,
            backingIndex: 'index',
          }),
          updateDefendInsight: vi.fn(),
        } as any,
        err: new Error('error'),
        latestReplacements: {},
        logger: { error: vi.fn() } as any,
        telemetry: { reportEvent: vi.fn() } as any,
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
          getDefendInsight: vi.fn().mockResolvedValueOnce({
            status: DefendInsightStatus.enum.running,
            backingIndex: 'backing-index-name',
            generationIntervals: [],
          }),
          updateDefendInsight: vi.fn(),
        } as any,
        latestReplacements: {},
        logger: { error: vi.fn() } as any,
        rawDefendInsights: '{"eventsContextCount": 5, "insights": ["insight1", "insight2"]}',
        startTime: moment(),
        telemetry: { reportEvent: vi.fn() } as any,
        insightType: DefendInsightType.enum.incompatible_antivirus,
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
          status: DefendInsightStatus.enum.succeeded,
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
          updateDefendInsights: vi.fn().mockResolvedValueOnce([{ id: insightId }]),
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
          updateDefendInsights: vi.fn(),
        } as any,
      };

      const result = await updateDefendInsightLastViewedAt(params);

      expect(params.dataClient.updateDefendInsights).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('runExternalCallbacks', () => {
    it('should call all registered callbacks with provided arguments', async () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      const mockRequest = {} as any;

      (appContextService.getRegisteredCallbacks as Mock).mockReturnValue([
        mockCallback1,
        mockCallback2,
      ]);

      await runExternalCallbacks('some-callback-id' as any, mockRequest);

      expect(mockCallback1).toHaveBeenCalledWith(mockRequest);
      expect(mockCallback2).toHaveBeenCalledWith(mockRequest);
    });

    it('should support callbacks with two arguments', async () => {
      const mockCallback = vi.fn();
      const mockRequest = {} as any;
      const mockArg = { extra: true };

      (appContextService.getRegisteredCallbacks as Mock).mockReturnValue([mockCallback]);

      await runExternalCallbacks('some-callback-id' as any, mockRequest, mockArg);

      expect(mockCallback).toHaveBeenCalledWith(mockRequest, mockArg);
    });

    it('should handle empty callback list gracefully', async () => {
      const mockRequest = {} as any;

      (appContextService.getRegisteredCallbacks as Mock).mockReturnValue([]);

      await expect(
        runExternalCallbacks('some-callback-id' as any, mockRequest)
      ).resolves.not.toThrow();
    });
  });
});

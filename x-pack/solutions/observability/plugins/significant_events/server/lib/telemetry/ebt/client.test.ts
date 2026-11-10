/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { EbtTelemetryClient } from './client';
import {
  SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
} from './constants';
import { CpsTelemetryContextProvider } from './cps_telemetry_context';

describe('EbtTelemetryClient', () => {
  let analyticsService: jest.Mocked<AnalyticsServiceSetup>;
  let client: EbtTelemetryClient;
  const request = { spaceId: 'space-a' } as KibanaRequest;

  beforeEach(() => {
    analyticsService = {
      reportEvent: jest.fn(),
      registerEventType: jest.fn(),
      registerShipper: jest.fn(),
      registerContextProvider: jest.fn(),
      removeContextProvider: jest.fn(),
      optIn: jest.fn(),
      telemetryCounter$: {} as any,
    };
    client = new EbtTelemetryClient(
      analyticsService,
      new CpsTelemetryContextProvider({
        cpsEnabled: false,
        getLinkedProjectIds: jest.fn(),
      }),
      loggerMock.create()
    );
  });

  describe('trackSignificantEventsQueriesGenerated', () => {
    it('tracks significant events queries generated events', () => {
      client.trackSignificantEventsQueriesGenerated(
        {
          count: 5,
          connector_id: 'test-connector',
          input_tokens_used: 300,
          output_tokens_used: 150,
          cached_tokens_used: 20,
          duration_ms: 1200,
          source_id: 'test-stream',
          tool_usage: {
            get_stream_features: {
              calls: 1,
              failures: 0,
              latency_ms: 100,
            },
            add_queries: {
              calls: 1,
              failures: 0,
              latency_ms: 100,
            },
          },
          external_content_tool_continuations: 3,
        },
        request
      );

      expect(analyticsService.reportEvent).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
        expect.objectContaining({
          count: 5,
          connector_id: 'test-connector',
          input_tokens_used: 300,
          output_tokens_used: 150,
          cached_tokens_used: 20,
          duration_ms: 1200,
          source_id: 'test-stream',
          tool_usage: {
            get_stream_features: {
              calls: 1,
              failures: 0,
              latency_ms: 100,
            },
            add_queries: {
              calls: 1,
              failures: 0,
              latency_ms: 100,
            },
          },
          external_content_tool_continuations: 3,
          space_id: 'space-a',
        })
      );
    });
  });

  describe('trackSignificantEventsDetectionScan', () => {
    it('adds every CPS target to a cross-project event', async () => {
      const getLinkedProjectIds = jest.fn().mockResolvedValue(['linked-project']);
      client = new EbtTelemetryClient(
        analyticsService,
        new CpsTelemetryContextProvider({
          cpsEnabled: true,
          originProjectId: 'origin-project',
          getLinkedProjectIds,
        }),
        loggerMock.create()
      );

      client.trackSignificantEventsDetectionScan(
        {
          took_ms: 42,
          duration_ms: 120,
          rules_requested: 24,
          rules_scanned: 18,
          critical_rule_count: 4,
          default_rule_count: 20,
          alerting_engine: 'v2',
          alerts_source_index: '.rule-events',
          lookback: 'now-40m',
          bucket_interval: '1m',
          default_lookback: 'now-125m',
          default_bucket_interval: '5m',
        },
        request
      );

      await getLinkedProjectIds.mock.results[0].value;
      await new Promise(setImmediate);

      expect(analyticsService.reportEvent).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
        expect.objectContaining({
          took_ms: 42,
          duration_ms: 120,
          rules_requested: 24,
          rules_scanned: 18,
          critical_rule_count: 4,
          default_rule_count: 20,
          alerting_engine: 'v2',
          alerts_source_index: '.rule-events',
          lookback: 'now-40m',
          bucket_interval: '1m',
          default_lookback: 'now-125m',
          default_bucket_interval: '5m',
          space_id: 'space-a',
          target_cluster_scope: 'all',
          target_cluster_ids: ['origin-project', 'linked-project'],
          target_cluster_ids_complete: true,
        })
      );
    });
  });

  describe('trackAgentBuilderKnowledgeIndicatorCreated', () => {
    it('reports origin scope without resolving linked projects', () => {
      const getLinkedProjectIds = jest.fn().mockResolvedValue(['linked-project']);
      client = new EbtTelemetryClient(
        analyticsService,
        new CpsTelemetryContextProvider({
          cpsEnabled: true,
          originProjectId: 'origin-project',
          getLinkedProjectIds,
        }),
        loggerMock.create()
      );

      client.trackAgentBuilderKnowledgeIndicatorCreated(
        { ki_kind: 'query', tool_id: 'ki_query_create', success: true, source_id: 'source-a' },
        request
      );

      expect(getLinkedProjectIds).not.toHaveBeenCalled();
      expect(analyticsService.reportEvent).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
        expect.objectContaining({
          space_id: 'space-a',
          target_cluster_scope: 'origin',
          target_cluster_ids: ['origin-project'],
          target_cluster_ids_complete: true,
        })
      );
    });
  });
});

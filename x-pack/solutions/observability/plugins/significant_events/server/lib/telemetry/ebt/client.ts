/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  AgentBuilderKnowledgeIndicatorCreatedProps,
  AgentToolEventCreateProps,
  AgentToolEventSearchProps,
  AgentToolFailedProps,
  AgentToolKnowledgeIndicatorIdentificationStartedProps,
  KnowledgeIndicatorFeaturesIdentifiedProps,
  KnowledgeIndicatorQueriesGenerationFailedProps,
  KnowledgeIndicatorQueriesGeneratedProps,
  KnowledgeIndicatorOnboardingScheduledProps,
  DetectionScanProps,
  DiscoveryCompletedProps,
  DiscoveryStartedProps,
  DiscoveryTriggeredProps,
  EventStatusChangedProps,
  AgentToolEventWriteProps,
  EbtTelemetryContext,
} from './types';
import type { CpsTelemetryContextProvider, TargetClusterScope } from './cps_telemetry_context';
import {
  NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
  NIGHTSHIFT_FEATURES_IDENTIFIED_EVENT_TYPE,
  NIGHTSHIFT_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_EVENT_SEARCH_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_FAILED_EVENT_TYPE,
  NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATION_FAILED_EVENT_TYPE,
  NIGHTSHIFT_DISCOVERY_COMPLETED_EVENT_TYPE,
  NIGHTSHIFT_DISCOVERY_STARTED_EVENT_TYPE,
  NIGHTSHIFT_DISCOVERY_TRIGGERED_EVENT_TYPE,
  NIGHTSHIFT_DETECTION_SCAN_EVENT_TYPE,
  NIGHTSHIFT_ONBOARDING_SCHEDULED_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_EVENT_WRITE_EVENT_TYPE,
  NIGHTSHIFT_EVENT_STATUS_CHANGED_EVENT_TYPE,
} from './constants';

type TrackParams<T> = Omit<T, keyof EbtTelemetryContext> & Partial<EbtTelemetryContext>;

export class EbtTelemetryClient {
  constructor(
    private readonly analytics: AnalyticsServiceSetup,
    private readonly contextProvider: CpsTelemetryContextProvider,
    private readonly logger: Logger
  ) {}

  public trackSignificantEventsQueriesGenerated(
    params: TrackParams<KnowledgeIndicatorQueriesGeneratedProps>,
    request: KibanaRequest
  ) {
    this.report(
      NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
      params,
      request,
      'all'
    );
  }

  public trackFeaturesIdentified(
    params: TrackParams<KnowledgeIndicatorFeaturesIdentifiedProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_FEATURES_IDENTIFIED_EVENT_TYPE, params, request, 'all');
  }

  public trackAgentBuilderKnowledgeIndicatorCreated(
    params: TrackParams<AgentBuilderKnowledgeIndicatorCreatedProps>,
    request: KibanaRequest
  ) {
    this.report(
      NIGHTSHIFT_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
      params,
      request,
      'origin'
    );
  }

  public trackAgentToolKiIdentificationStarted(
    params: TrackParams<AgentToolKnowledgeIndicatorIdentificationStartedProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE, params, request, 'all');
  }

  public trackAgentToolEventCreate(
    params: TrackParams<AgentToolEventCreateProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE, params, request, 'origin');
  }

  public trackSignificantEventsDiscoveryStarted(
    params: TrackParams<DiscoveryStartedProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_DISCOVERY_STARTED_EVENT_TYPE, params, request, 'all');
  }

  public trackSignificantEventsDiscoveryCompleted(
    params: TrackParams<DiscoveryCompletedProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_DISCOVERY_COMPLETED_EVENT_TYPE, params, request, 'all');
  }

  public trackEventStatusChanged(
    params: TrackParams<EventStatusChangedProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_EVENT_STATUS_CHANGED_EVENT_TYPE, params, request, 'origin');
  }

  public trackSignificantEventsDiscoveryTriggered(
    params: TrackParams<DiscoveryTriggeredProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_DISCOVERY_TRIGGERED_EVENT_TYPE, params, request, 'all');
  }

  public trackOnboardingScheduled(
    params: TrackParams<KnowledgeIndicatorOnboardingScheduledProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_ONBOARDING_SCHEDULED_EVENT_TYPE, params, request, 'all');
  }

  public trackSignificantEventsDetectionScan(
    params: TrackParams<DetectionScanProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_DETECTION_SCAN_EVENT_TYPE, params, request, 'origin');
  }

  public trackAgentToolEventsWrite(
    params: TrackParams<AgentToolEventWriteProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_AGENT_TOOL_EVENT_WRITE_EVENT_TYPE, params, request, 'origin');
  }

  public trackAgentToolEventSearch(
    params: TrackParams<AgentToolEventSearchProps>,
    request: KibanaRequest
  ) {
    this.report(NIGHTSHIFT_AGENT_TOOL_EVENT_SEARCH_EVENT_TYPE, params, request, 'origin');
  }

  private report<T>(
    eventType: string,
    params: T,
    request: KibanaRequest,
    targetClusterScope: TargetClusterScope
  ): void {
    const context = this.contextProvider.get(request, targetClusterScope);
    const report = (resolvedContext: EbtTelemetryContext) =>
      this.analytics.reportEvent(eventType, { ...params, ...resolvedContext });

    if (context instanceof Promise) {
      void context
        .then(report)
        .catch((error) => this.logger.error('Failed to report CPS telemetry', { error }));
      return;
    }

    report(context);
  }

  public trackAgentToolFailed(params: TrackParams<AgentToolFailedProps>, request: KibanaRequest) {
    this.report(NIGHTSHIFT_AGENT_TOOL_FAILED_EVENT_TYPE, params, request, 'origin');
  }

  public trackSignificantEventsQueriesGenerationFailed(
    params: TrackParams<KnowledgeIndicatorQueriesGenerationFailedProps>,
    request: KibanaRequest
  ) {
    this.report(
      NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATION_FAILED_EVENT_TYPE,
      params,
      request,
      'all'
    );
  }
}

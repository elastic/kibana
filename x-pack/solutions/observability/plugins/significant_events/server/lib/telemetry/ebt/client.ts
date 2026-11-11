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
  AgentToolEventInvestigationAttachProps,
  AgentToolEventSearchProps,
  AgentToolEventStatusUpdateProps,
  AgentToolKnowledgeIndicatorIdentificationStartedProps,
  KnowledgeIndicatorFeaturesIdentifiedProps,
  KnowledgeIndicatorQueriesGeneratedProps,
  KnowledgeIndicatorOnboardingScheduledProps,
  DetectionScanProps,
  DiscoveryTriggeredProps,
  EventStatusChangedProps,
  AgentToolEventWriteProps,
  EbtTelemetryContext,
} from './types';
import type { CpsTelemetryContextProvider, TargetClusterScope } from './cps_telemetry_context';
import {
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_FEATURES_IDENTIFIED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_SEARCH_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_STATUS_UPDATE_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_INVESTIGATION_ATTACH_EVENT_TYPE,
  SIGNIFICANT_EVENTS_DISCOVERY_TRIGGERED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
  SIGNIFICANT_EVENTS_ONBOARDING_SCHEDULED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_WRITE_EVENT_TYPE,
  SIGNIFICANT_EVENTS_EVENT_STATUS_CHANGED_EVENT_TYPE,
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
      SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
      params,
      request,
      'all'
    );
  }

  public trackFeaturesIdentified(
    params: TrackParams<KnowledgeIndicatorFeaturesIdentifiedProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_FEATURES_IDENTIFIED_EVENT_TYPE, params, request, 'all');
  }

  public trackAgentBuilderKnowledgeIndicatorCreated(
    params: TrackParams<AgentBuilderKnowledgeIndicatorCreatedProps>,
    request: KibanaRequest
  ) {
    this.report(
      SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
      params,
      request,
      'origin'
    );
  }

  public trackAgentToolKiIdentificationStarted(
    params: TrackParams<AgentToolKnowledgeIndicatorIdentificationStartedProps>,
    request: KibanaRequest
  ) {
    this.report(
      SIGNIFICANT_EVENTS_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
      params,
      request,
      'all'
    );
  }

  public trackAgentToolEventCreate(
    params: TrackParams<AgentToolEventCreateProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE, params, request, 'origin');
  }

  public trackAgentToolEventStatusUpdate(
    params: TrackParams<AgentToolEventStatusUpdateProps>,
    request: KibanaRequest
  ) {
    this.report(
      SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_STATUS_UPDATE_EVENT_TYPE,
      params,
      request,
      'origin'
    );
  }

  public trackAgentToolEventInvestigationAttach(
    params: TrackParams<AgentToolEventInvestigationAttachProps>,
    request: KibanaRequest
  ) {
    this.report(
      SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_INVESTIGATION_ATTACH_EVENT_TYPE,
      params,
      request,
      'origin'
    );
  }

  public trackEventStatusChanged(
    params: TrackParams<EventStatusChangedProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_EVENT_STATUS_CHANGED_EVENT_TYPE, params, request, 'origin');
  }

  public trackSignificantEventsDiscoveryTriggered(
    params: TrackParams<DiscoveryTriggeredProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_DISCOVERY_TRIGGERED_EVENT_TYPE, params, request, 'all');
  }

  public trackOnboardingScheduled(
    params: TrackParams<KnowledgeIndicatorOnboardingScheduledProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_ONBOARDING_SCHEDULED_EVENT_TYPE, params, request, 'all');
  }

  public trackSignificantEventsDetectionScan(
    params: TrackParams<DetectionScanProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE, params, request, 'all');
  }

  public trackAgentToolEventsWrite(
    params: TrackParams<AgentToolEventWriteProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_WRITE_EVENT_TYPE, params, request, 'origin');
  }

  public trackAgentToolEventSearch(
    params: TrackParams<AgentToolEventSearchProps>,
    request: KibanaRequest
  ) {
    this.report(SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_SEARCH_EVENT_TYPE, params, request, 'origin');
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
        .catch((error) => this.logger.debug('Failed to report CPS telemetry', { error }));
      return;
    }

    report(context);
  }
}

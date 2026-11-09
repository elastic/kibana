/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { Logger } from '@kbn/core/server';
import {
  agentBuilderKnowledgeIndicatorCreatedEventType,
  agentToolEventCreateEventType,
  agentToolEventInvestigationAttachEventType,
  agentToolEventStatusUpdateEventType,
  agentToolKiIdentificationStartedEventType,
  detectionScanEventType,
  discoveryTriggeredEventType,
  knowledgeIndicatorEventsGeneratedEventType,
  knowledgeIndicatorFeaturesIdentifiedEventType,
  onboardingScheduledEventType,
  agentToolEventWriteEventType,
  agentToolEventSearchEventType,
} from './events';
import { EbtTelemetryClient } from './client';
import {
  CpsTelemetryContextProvider,
  type CpsTelemetryContextConfig,
} from './cps_telemetry_context';

export class EbtTelemetryService {
  private analytics?: AnalyticsServiceSetup;
  private contextProvider?: CpsTelemetryContextProvider;
  private logger?: Logger;

  constructor() {}

  public setup(
    analytics: AnalyticsServiceSetup,
    contextConfig: CpsTelemetryContextConfig,
    logger: Logger
  ) {
    this.analytics = analytics;
    this.contextProvider = new CpsTelemetryContextProvider(contextConfig);
    this.logger = logger;
    this.analytics.registerEventType(knowledgeIndicatorEventsGeneratedEventType);
    this.analytics.registerEventType(knowledgeIndicatorFeaturesIdentifiedEventType);
    this.analytics.registerEventType(agentBuilderKnowledgeIndicatorCreatedEventType);
    this.analytics.registerEventType(agentToolKiIdentificationStartedEventType);
    this.analytics.registerEventType(agentToolEventCreateEventType);
    this.analytics.registerEventType(agentToolEventStatusUpdateEventType);
    this.analytics.registerEventType(agentToolEventWriteEventType);
    this.analytics.registerEventType(agentToolEventSearchEventType);
    this.analytics.registerEventType(agentToolEventInvestigationAttachEventType);
    this.analytics.registerEventType(discoveryTriggeredEventType);
    this.analytics.registerEventType(detectionScanEventType);
    this.analytics.registerEventType(onboardingScheduledEventType);
  }

  public getClient() {
    if (!this.analytics || !this.contextProvider || !this.logger) {
      throw new Error('Analytics service is not available.');
    }
    return new EbtTelemetryClient(this.analytics, this.contextProvider, this.logger);
  }
}

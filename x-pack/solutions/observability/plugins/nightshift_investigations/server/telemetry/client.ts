/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import {
  NIGHTSHIFT_SEMANTIC_MEMORY_MATERIALIZED_EVENT,
  NIGHTSHIFT_SEMANTIC_MEMORY_OPTIMIZED_EVENT,
  type SemanticMemoryMaterializedEvent,
  type SemanticMemoryOptimizedEvent,
} from './events';

export class NightshiftTelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceSetup, private readonly logger: Logger) {}

  reportSemanticMemoryMaterialized(event: SemanticMemoryMaterializedEvent): void {
    this.report(NIGHTSHIFT_SEMANTIC_MEMORY_MATERIALIZED_EVENT, event);
  }

  reportSemanticMemoryOptimized(event: SemanticMemoryOptimizedEvent): void {
    this.report(NIGHTSHIFT_SEMANTIC_MEMORY_OPTIMIZED_EVENT, event);
  }

  private report(eventType: string, event: object): void {
    try {
      this.analytics.reportEvent(eventType, event);
    } catch (error) {
      this.logger.debug(`Failed to report ${eventType} telemetry`, { error });
    }
  }
}

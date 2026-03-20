/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PipelineExecutionResult } from './types';

export type PipelineAuditAction =
  | 'pipeline_started'
  | 'pipeline_completed'
  | 'pipeline_failed'
  | 'case_created'
  | 'case_matched'
  | 'alerts_attached'
  | 'attack_discovery_triggered'
  | 'alerts_tagged_processed';

export interface PipelineAuditEvent {
  readonly action: PipelineAuditAction;
  readonly executionId: string;
  readonly spaceId: string;
  readonly timestamp: string;
  readonly details: Record<string, unknown>;
}

/**
 * Audit logger for the alert investigation pipeline.
 * Emits structured events to the Kibana audit log for compliance and traceability.
 *
 * Uses the standard Kibana logger with `audit` tag so that events are captured
 * by the audit log appender when configured. This approach is consistent with
 * other Security Solution audit logging patterns.
 */
export class PipelineAuditLogger {
  private readonly auditLogger: Logger;

  constructor(logger: Logger) {
    this.auditLogger = logger;
  }

  logStart(executionId: string, spaceId: string, dryRun: boolean): void {
    this.emit({
      action: 'pipeline_started',
      executionId,
      spaceId,
      timestamp: new Date().toISOString(),
      details: { dryRun },
    });
  }

  logComplete(executionId: string, spaceId: string, result: PipelineExecutionResult): void {
    this.emit({
      action: 'pipeline_completed',
      executionId,
      spaceId,
      timestamp: new Date().toISOString(),
      details: {
        alertsProcessed: result.alertsProcessed,
        alertsDeduplicated: result.alertsDeduplicated,
        entitiesExtracted: result.entitiesExtracted,
        casesMatched: result.casesMatched,
        casesCreated: result.casesCreated,
        alertsAttached: result.alertsAttached,
        adTriggered: result.adTriggered,
        errorCount: result.errors.length,
      },
    });
  }

  logFailed(executionId: string, spaceId: string, error: string): void {
    this.emit({
      action: 'pipeline_failed',
      executionId,
      spaceId,
      timestamp: new Date().toISOString(),
      details: { error },
    });
  }

  logCaseCreated(executionId: string, spaceId: string, caseId: string, alertCount: number): void {
    this.emit({
      action: 'case_created',
      executionId,
      spaceId,
      timestamp: new Date().toISOString(),
      details: { caseId, alertCount },
    });
  }

  logCaseMatched(
    executionId: string,
    spaceId: string,
    caseId: string,
    matchedAlertIds: string[]
  ): void {
    this.emit({
      action: 'case_matched',
      executionId,
      spaceId,
      timestamp: new Date().toISOString(),
      details: { caseId, matchedAlertCount: matchedAlertIds.length },
    });
  }

  logAlertsAttached(
    executionId: string,
    spaceId: string,
    caseId: string,
    alertCount: number
  ): void {
    this.emit({
      action: 'alerts_attached',
      executionId,
      spaceId,
      timestamp: new Date().toISOString(),
      details: { caseId, alertCount },
    });
  }

  logAdTriggered(executionId: string, spaceId: string, caseId: string): void {
    this.emit({
      action: 'attack_discovery_triggered',
      executionId,
      spaceId,
      timestamp: new Date().toISOString(),
      details: { caseId },
    });
  }

  private emit(event: PipelineAuditEvent): void {
    this.auditLogger.info(
      `[pipeline-audit] ${event.action} | execution=${event.executionId} space=${
        event.spaceId
      } ${JSON.stringify(event.details)}`
    );
  }
}

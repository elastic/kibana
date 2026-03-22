/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsClient } from '@kbn/workflows-client';

import { ALERT_INVESTIGATION_TRIGGER_ID } from '../../common/workflows/triggers/alert_created';
import type { AlertCreatedEvent } from '../../common/workflows/triggers/alert_created';

/**
 * Emit alert.created event when high-risk alert is created
 *
 * INTEGRATION POINT: This should be called from the Detection Engine
 * after an alert is created and persisted to Elasticsearch
 *
 * Location to integrate:
 * - x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_actions_legacy/create_alert_event_log_record.ts
 * - OR x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/signals/bulk_create_ml_signals.ts
 *
 * When to emit:
 * - After alert is successfully written to .alerts-security.alerts-* index
 * - Only for CRITICAL or HIGH severity alerts (filter by kibana.alert.severity)
 * - Only for NEW alerts (not updates to existing alerts)
 */
export async function emitAlertCreatedEvent({
  alert,
  workflowsClient,
  logger,
}: {
  alert: {
    _id: string;
    _index: string;
    _source: {
      'kibana.alert.severity'?: string;
      'kibana.alert.risk_score'?: number;
      'kibana.alert.rule.name'?: string;
      'kibana.alert.case_ids'?: string[];
      '@timestamp': string;
    };
  };
  workflowsClient: WorkflowsClient;
  logger: Logger;
}): Promise<void> {
  const severity = alert._source['kibana.alert.severity'];
  const riskScore = alert._source['kibana.alert.risk_score'];

  // Only emit for high-risk alerts
  const isHighRisk =
    severity === 'critical' || severity === 'high' || (riskScore && riskScore >= 75);

  if (!isHighRisk) {
    logger.debug(
      `[Alert Investigation] Skipping event emission for low-risk alert ${alert._id} (severity: ${severity}, risk: ${riskScore})`
    );
    return;
  }

  try {
    const event: AlertCreatedEvent = {
      alert_id: alert._id,
      alert_index: alert._index,
      severity: severity || 'unknown',
      risk_score: riskScore,
      rule_name: alert._source['kibana.alert.rule.name'],
      case_id: alert._source['kibana.alert.case_ids']?.[0], // First case if attached
      timestamp: alert._source['@timestamp'],
    };

    logger.info(
      `[Alert Investigation] Emitting alert.created event for high-risk alert ${alert._id} (severity: ${severity}, risk: ${riskScore})`
    );

    await workflowsClient.emitEvent(ALERT_INVESTIGATION_TRIGGER_ID, event);

    logger.debug(`[Alert Investigation] Event emitted successfully for alert ${alert._id}`);
  } catch (error) {
    // Don't fail alert creation if workflow event fails
    logger.error(
      `[Alert Investigation] Failed to emit event for alert ${alert._id}: ${error.message}`
    );
  }
}

/**
 * Get workflows client from request
 *
 * Helper to get workflows client from Kibana request context
 */
export function getWorkflowsClient(request: KibanaRequest): WorkflowsClient | undefined {
  // Workflows client is available from request context if workflows_extensions plugin is enabled
  // This would be added to ElasticAssistantRequestHandlerContext
  return (request as any).context?.workflows?.client;
}

/**
 * Integration Instructions for Detection Engine Team
 *
 * TO ENABLE AUTOMATED INVESTIGATIONS:
 *
 * 1. Add this import to your alert creation file:
 *    import { emitAlertCreatedEvent, getWorkflowsClient } from '@kbn/elastic-assistant-plugin/server/workflows/emit_alert_events';
 *
 * 2. After alert is successfully created and persisted, call:
 *
 *    ```typescript
 *    // After alert creation succeeds
 *    const workflowsClient = getWorkflowsClient(request);
 *    if (workflowsClient) {
 *      await emitAlertCreatedEvent({
 *        alert: createdAlert,
 *        workflowsClient,
 *        logger,
 *      });
 *    }
 *    ```
 *
 * 3. This will trigger any workflows subscribed to the alert.created event
 *
 * FILES TO MODIFY:
 * - x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_actions/create_alert_event_log_record.ts
 * - x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/signals/single_bulk_create.ts
 *
 * TESTING:
 * - Create a high-risk alert (CRITICAL or HIGH severity)
 * - Verify workflow triggers (check workflows execution logs)
 * - Verify investigation runs (check LangSmith traces)
 */

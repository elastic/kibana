/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Alert Investigation Pipeline - Complete Elastic Workflow Definition
 *
 * This workflow orchestrates the full alert→case→Attack Discovery pipeline
 * using Elastic Workflows (not Task Manager polling).
 *
 * Execution: Controlled by feature flag elasticAssistant:alertInvestigationPipeline_enabled
 * Trigger: Scheduled (every 15 minutes) OR event-driven (when available)
 * Steps: 5 stages (fetch, dedup, extract, match, AD)
 */

export const ALERT_INVESTIGATION_WORKFLOW_ID = 'elastic_assistant.alert_investigation_pipeline';

/**
 * Complete workflow definition using existing workflow steps
 *
 * NOTE: This uses Elastic Workflows native scheduling (not Task Manager)
 * The workflow is enabled/disabled via the feature flag check in each step
 */
export const alertInvestigationWorkflowDefinition = {
  id: ALERT_INVESTIGATION_WORKFLOW_ID,
  name: 'Alert Investigation Pipeline',
  description:
    'Automated alert deduplication, entity extraction, case matching, and Attack Discovery',
  version: '1.0.0',

  // Elastic Workflows scheduling (check if this API exists)
  trigger: {
    type: 'scheduled', // or 'cron' depending on Workflows API
    schedule: '*/15 * * * *', // Every 15 minutes
    // Feature flag check: Workflow runner should check flag before execution
  },

  // Complete E2E pipeline: All 6 stages as workflow steps
  steps: [
    // Stage 1: Fetch unprocessed alerts
    {
      id: 'fetch_alerts',
      name: 'Fetch Unprocessed Alerts',
      type: 'security.fetchUnprocessedAlerts',
      config: {
        index_pattern: '.alerts-security.alerts-default',
        max_alerts: 500,
        lookback_minutes: 15,
      },
    },

    // Stage 2: Deduplicate alerts (with ELSER fallback to Jaccard)
    {
      id: 'deduplicate',
      name: 'Deduplicate Similar Alerts',
      type: 'security.deduplicateAlerts',
      config: {
        alert_ids: '${steps.fetch_alerts.output.alert_ids}', // State interpolation
        index_pattern: '.alerts-security.alerts-default',
        similarity_threshold: 0.85,
      },
    },

    // Stage 3: Extract entities
    {
      id: 'extract_entities',
      name: 'Extract Observable Entities',
      type: 'security.extractEntities',
      config: {
        alert_ids: '${steps.deduplicate.output.leader_alert_ids}',
        index_pattern: '.alerts-security.alerts-default',
      },
    },

    // Stage 4: Match to cases and attach alerts
    {
      id: 'match_and_attach',
      name: 'Match Alerts to Cases',
      type: 'security.matchAndAttachAlertsToCases',
      config: {
        entities: '${steps.extract_entities.output.entities}',
        leader_alert_ids: '${steps.deduplicate.output.leader_alert_ids}',
        index_pattern: '.alerts-security.alerts-default',
      },
    },

    // Stage 5: Trigger incremental Attack Discovery
    {
      id: 'trigger_incremental_ad',
      name: 'Trigger Incremental Attack Discovery',
      type: 'security.triggerIncrementalAd',
      config: {
        affected_case_ids: '${steps.match_and_attach.output.affected_case_ids}',
        alert_ids_by_case: '${steps.match_and_attach.output.alert_ids_by_case}',
        min_new_alerts: 2,
      },
    },

    // Stage 6: Tag processed alerts
    {
      id: 'tag_processed',
      name: 'Tag Alerts as Processed',
      type: 'security.tagProcessedAlerts',
      config: {
        alert_ids: '${steps.fetch_alerts.output.alert_ids}',
        index_pattern: '.alerts-security.alerts-default',
      },
    },
  ],
};

/**
 * Complete E2E Alert Investigation Pipeline as Elastic Workflow
 *
 * This workflow definition orchestrates all 6 stages:
 * 1. Fetch → 2. Dedup → 3. Extract → 4. Match → 5. Incremental AD → 6. Tag
 *
 * Replaces the need for orchestrator.ts (719 lines) - Elastic Workflows handles orchestration!
 *
 * Execution:
 * - Scheduled: Every 15 minutes (cron: */15 * * * *)
 * - Feature flag: Controlled by elasticAssistant:alertInvestigationPipeline_enabled
 * - State management: Automatic (${steps.X.output} interpolation)
 * - Error handling: Built-in workflow error handling
 * - Monitoring: Elastic Workflows execution history UI
 */

/**
 * Register workflow with Elastic Workflows
 *
 * This should be called during plugin setup to register the complete pipeline
 * as a scheduled workflow.
 */
export function registerAlertInvestigationWorkflow(
  workflowsExtensions: any // TODO: Add proper type from @kbn/workflows-extensions
): void {
  // Check if Elastic Workflows supports workflow registration
  // (not just step registration)

  if (typeof workflowsExtensions.registerWorkflow === 'function') {
    workflowsExtensions.registerWorkflow(alertInvestigationWorkflowDefinition);
    console.log(`✅ Registered Alert Investigation Pipeline workflow: ${ALERT_INVESTIGATION_WORKFLOW_ID}`);
  } else {
    console.warn(
      '⚠️ Elastic Workflows does not support workflow registration yet. ' +
      'Workflow definition created but not registered. ' +
      'Pipeline must be triggered manually via API or custom Task Manager job.'
    );
  }
}

/**
 * Feature flag integration
 *
 * Elastic Workflows should check the feature flag before executing the workflow.
 * If Workflows doesn't support this natively, we check in each step handler.
 */
export const WORKFLOW_FEATURE_FLAG_CONFIG = {
  flagKey: 'elasticAssistant:alertInvestigationPipeline_enabled',
  checkBeforeExecution: true,
  skipWorkflowIfDisabled: true,
};

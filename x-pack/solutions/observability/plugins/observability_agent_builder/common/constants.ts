/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Inference Feature Registry IDs
export const OBSERVABILITY_AI_INSIGHTS_INFERENCE_PARENT_FEATURE_ID =
  'observability_ai_insights_inference_parent_feature';
export const OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID =
  'observability_ai_insights_inference_subfeature';

// Attachment type IDs
export const OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID = 'observability.ai_insight';
export const OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID = 'observability.error';
export const OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID = 'observability.alert';
export const OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID = 'observability.log';
export const OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID = 'observability.service';
export const OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID = 'observability.slo';
export const OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID = 'observability.host';
export const OBSERVABILITY_TRANSACTION_ATTACHMENT_TYPE_ID = 'observability.transaction';
export const OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID = 'observability.synthetics_monitor';

// Conversation template IDs used by the Agent Builder Option B POC.
export const OBSERVABILITY_INVESTIGATION_TEMPLATE_ID = 'observability-investigation-v1';
export const OBSERVABILITY_INCIDENT_TEMPLATE_ID = 'observability-incident-v1';

// Periodic workflow hook runner for persisted group conversations.
export const OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_TYPE =
  'observability-agent-builder:conversation-workflow-hooks';
export const OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_ID =
  'observability-agent-builder:conversation-workflow-hooks';

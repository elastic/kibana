/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OBSERVABILITY_AGENT_FEATURE_FLAG = 'observabilityAgent.enabled';
export const OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT = false;

// Duplicate of the tool IDs defined in @kbn/apm-plugin/common/observability_agent/agent_tool_ids.ts
// Re-defined here to avoid cross-plugin dependency cycles

// The below tools are registered in the APM plugin for the Observability Agent to use
export const OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID =
  'observability.get_downstream_dependencies';
export const OBSERVABILITY_GET_SERVICES_TOOL_ID = 'observability.get_services';

// The below tools are registered in the APM plugin to be used in attachments
export const OBSERVABILITY_GET_ERROR_BY_ID_TOOL_ID = 'observability.get_error_by_id';
export const OBSERVABILITY_GET_TRANSACTION_BY_ID_TOOL_ID = 'observability.get_transaction_by_id';
export const OBSERVABILITY_GET_TRACE_OVERVIEW_BY_ID_TOOL_ID =
  'observability.get_trace_overview_by_id';
export const OBSERVABILITY_GET_SPAN_BY_ID_TOOL_ID = 'observability.get_span_by_id';
export const OBSERVABILITY_GET_ERROR_GROUP_BY_KEY_TOOL_ID = 'observability.get_error_group_by_key';

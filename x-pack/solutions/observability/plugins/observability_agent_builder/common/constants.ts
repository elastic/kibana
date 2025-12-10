/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Duplicate of the tool IDs defined in @kbn/apm-plugin/common/agent_builder/tool_ids.ts
// Re-defined here to avoid cross-plugin dependency cycles
export const OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID =
  'observability.get_downstream_dependencies';
export const OBSERVABILITY_GET_SERVICES_TOOL_ID = 'observability.get_services';

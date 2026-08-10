/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Production managed workflow ID — reserved prefix, installed server-side by the plugin.
// TODO: Switch RULE_CREATION_WORKFLOW_ID back to this once the plugin install lands.
export const PRODUCTION_WORKFLOW_ID = 'system-security-rule-creation';

// Eval-only ID: 'system-*' is reserved for managed workflows so can't be created via the
// public API. This non-reserved ID is used by ensureWorkflowInstalled in beforeAll.
export const RULE_CREATION_WORKFLOW_ID = 'detection-watch-rule-creation';

export const WORKFLOWS_API_VERSION = '2023-10-31';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ERROR_SENTRY_APP_ID = 'errorSentry' as const;
export const ERROR_SENTRY_APP_TITLE = 'Error Sentry' as const;
export const ERROR_SENTRY_PLUGIN_ID = 'errorSentry' as const;

export {
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
  ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
  ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
  ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';

export const ERROR_SENTRY_AGENT_ID = 'detective-ralph' as const;

export const CASES_OWNER = 'observability' as const;

export const CAPTURE_LOG_INDEX_DEFAULT = 'logs.otel' as const;
export const CAPTURE_LOG_CATEGORY_FIELD_DEFAULT = 'body.text' as const;
export const CAPTURE_LOG_LEVELS_DEFAULT = ['ERROR', 'FATAL', 'WARN'] as const;
export const CAPTURE_CONFIG_INDEX = '.error-sentry-config' as const;
export const CAPTURE_CONFIG_DOC_ID = 'capture-config' as const;

export const SCS_CODE_INDEX_PATTERN = 'code-*' as const;
export const SCS_LOCATIONS_SUFFIX = '_locations' as const;

export const GITHUB_CONNECTOR_ID = 'github' as const;

export type ComponentId =
  | 'step'
  | 'workflow_capture'
  | 'workflow_escalate_github'
  | 'workflow_ask_ralph'
  | 'workflow_introspect'
  | 'workflow_ralph_investigation'
  | 'agent_ralph'
  | 'github_connector'
  | 'scs_repos'
  | 'scs_tools'
  | 'log_source';

export type ComponentState =
  | 'ok'
  | 'missing'
  | 'drifted'
  | 'error'
  | 'unavailable'
  | 'warning'
  | 'info';

export interface ComponentStatus {
  id: ComponentId;
  label: string;
  state: ComponentState;
  detail?: string;
  repairable: boolean;
  actionLink?: string;
}

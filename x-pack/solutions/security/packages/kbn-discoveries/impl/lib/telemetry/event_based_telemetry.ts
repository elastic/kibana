/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

import type { ErrorCategory } from '@kbn/discoveries-schemas';
export type { ErrorCategory } from '@kbn/discoveries-schemas';

/**
 * Workflow-augmented attack discovery success event.
 *
 * This mirrors the `attack_discovery_success` event type already registered
 * by `elastic_assistant`, extended with optional workflow-specific fields.
 * Both plugins share the same event type name so all events land in the
 * same telemetry stream.
 */
export const WORKFLOW_ATTACK_DISCOVERY_SUCCESS_EVENT: EventTypeOpts<{
  actionTypeId: string;
  alertsContextCount: number;
  alertsCount: number;
  configuredAlertsCount: number;
  custom_retrieval_workflow_count?: number;
  dateRangeDuration: number;
  default_alert_retrieval_mode?: string;
  discoveriesGenerated: number;
  duplicatesDroppedCount?: number;
  durationMs: number;
  execution_mode?: string;
  hallucinations_filtered_count?: number;
  hasFilter: boolean;
  isDefaultDateRange: boolean;
  model?: string;
  prebuilt_step_types_used?: string[];
  provider?: string;
  retrieval_workflow_count?: number;
  trigger?: string;
  uses_default_retrieval?: boolean;
  uses_default_validation?: boolean;
  validation_discoveries_count?: number;
}> = {
  eventType: 'attack_discovery_success',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: { description: 'Kibana connector type', optional: false },
    },
    alertsContextCount: {
      type: 'integer',
      _meta: { description: 'Number of alerts sent as context to the LLM', optional: false },
    },
    alertsCount: {
      type: 'integer',
      _meta: {
        description: 'Number of unique alerts referenced in the attack discoveries',
        optional: false,
      },
    },
    configuredAlertsCount: {
      type: 'integer',
      _meta: { description: 'Number of alerts configured by the user', optional: false },
    },
    custom_retrieval_workflow_count: {
      type: 'integer',
      _meta: {
        description: 'Number of user-selected custom alert retrieval workflows',
        optional: true,
      },
    },
    dateRangeDuration: {
      type: 'integer',
      _meta: { description: 'Duration of time range of request in hours', optional: false },
    },
    default_alert_retrieval_mode: {
      type: 'keyword',
      _meta: {
        description: 'The default alert retrieval mode (custom_query/esql/disabled)',
        optional: true,
      },
    },
    discoveriesGenerated: {
      type: 'integer',
      _meta: { description: 'Quantity of attack discoveries generated', optional: false },
    },
    duplicatesDroppedCount: {
      type: 'integer',
      _meta: {
        description: 'Number of discoveries dropped because they were duplicates of existing ones',
        optional: true,
      },
    },
    durationMs: {
      type: 'integer',
      _meta: { description: 'Duration of request in ms', optional: false },
    },
    execution_mode: {
      type: 'keyword',
      _meta: {
        description: 'Execution mode (workflow)',
        optional: true,
      },
    },
    hallucinations_filtered_count: {
      type: 'integer',
      _meta: {
        description: 'Number of discoveries filtered out as hallucinations by the validation step',
        optional: true,
      },
    },
    hasFilter: {
      type: 'boolean',
      _meta: {
        description: 'Whether a filter was applied to the alerts used as context',
        optional: false,
      },
    },
    isDefaultDateRange: {
      type: 'boolean',
      _meta: {
        description: 'Whether the date range is the default of last 24 hours',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: { description: 'LLM model', optional: true },
    },
    prebuilt_step_types_used: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: { description: 'Prebuilt step type ID used in execution' },
      },
      _meta: {
        description: 'Which prebuilt step type IDs appeared in the execution',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: { description: 'OpenAI provider', optional: true },
    },
    retrieval_workflow_count: {
      type: 'integer',
      _meta: { description: 'Total number of retrieval workflows executed', optional: true },
    },
    trigger: {
      type: 'keyword',
      _meta: {
        description: 'What triggered the generation (manual/scheduled)',
        optional: true,
      },
    },
    uses_default_retrieval: {
      type: 'boolean',
      _meta: { description: 'Whether the default retrieval workflow was run', optional: true },
    },
    uses_default_validation: {
      type: 'boolean',
      _meta: { description: 'Whether the default validation workflow was used', optional: true },
    },
    validation_discoveries_count: {
      type: 'integer',
      _meta: {
        description:
          'Number of discoveries actually persisted (after hallucination filtering and deduplication)',
        optional: true,
      },
    },
  },
};

/**
 * Server-side event for schedule lifecycle actions (create, update, delete,
 * enable, disable). Emitted after successful completion of the operation.
 */
export const ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT: EventTypeOpts<{
  action: string;
  has_actions?: boolean;
  interval?: string;
}> = {
  eventType: 'attack_discovery_schedule_action',
  schema: {
    action: {
      type: 'keyword',
      _meta: {
        description: 'Schedule action performed (create/update/delete/enable/disable)',
        optional: false,
      },
    },
    has_actions: {
      type: 'boolean',
      _meta: {
        description: 'Whether the schedule has notification actions configured',
        optional: true,
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: 'Schedule interval (e.g. "1h", "24h")',
        optional: true,
      },
    },
  },
};

/**
 * Workflow-augmented attack discovery error event.
 */
export const WORKFLOW_ATTACK_DISCOVERY_ERROR_EVENT: EventTypeOpts<{
  actionTypeId: string;
  errorMessage: string;
  execution_mode?: string;
  failed_step?: string;
  misconfiguration_detected?: boolean;
  model?: string;
  provider?: string;
  trigger?: string;
}> = {
  eventType: 'attack_discovery_error',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: { description: 'Kibana connector type', optional: false },
    },
    errorMessage: {
      type: 'keyword',
      _meta: { description: 'Error message from Elasticsearch' },
    },
    execution_mode: {
      type: 'keyword',
      _meta: {
        description: 'Execution mode (workflow)',
        optional: true,
      },
    },
    failed_step: {
      type: 'keyword',
      _meta: {
        description:
          'Which pipeline step failed (alert_retrieval/generation/validation), if applicable',
        optional: true,
      },
    },
    misconfiguration_detected: {
      type: 'boolean',
      _meta: {
        description: 'Whether a misconfiguration was detected as the root cause of the failure',
        optional: true,
      },
    },
    model: {
      type: 'keyword',
      _meta: { description: 'LLM model', optional: true },
    },
    provider: {
      type: 'keyword',
      _meta: { description: 'OpenAI provider', optional: true },
    },
    trigger: {
      type: 'keyword',
      _meta: {
        description: 'What triggered the generation (manual/scheduled)',
        optional: true,
      },
    },
  },
};

export type MisconfigurationType =
  | 'alerts_index_missing'
  | 'connector_unreachable'
  | 'default_workflows_resolution_failed'
  | 'step_registration_failed'
  | 'workflow_disabled'
  | 'workflow_modified'
  | 'workflow_not_found';

/**
 * Emitted when a misconfiguration is detected that prevents or degrades
 * Attack Discovery execution. Provides fleet-wide visibility into
 * configuration problems.
 */
export const ATTACK_DISCOVERY_MISCONFIGURATION_EVENT: EventTypeOpts<{
  detail?: string;
  misconfiguration_type: MisconfigurationType;
  space_id?: string;
  workflow_id?: string;
}> = {
  eventType: 'attack_discovery_misconfiguration',
  schema: {
    detail: {
      type: 'keyword',
      _meta: {
        description: 'Human-readable detail about the misconfiguration',
        optional: true,
      },
    },
    misconfiguration_type: {
      type: 'keyword',
      _meta: {
        description:
          'Category of misconfiguration (workflow_not_found, workflow_disabled, connector_unreachable, alerts_index_missing, step_registration_failed, default_workflows_resolution_failed)',
        optional: false,
      },
    },
    space_id: {
      type: 'keyword',
      _meta: {
        description: 'Space where the misconfiguration was detected',
        optional: true,
      },
    },
    workflow_id: {
      type: 'keyword',
      _meta: {
        description: 'Workflow ID related to the misconfiguration, if applicable',
        optional: true,
      },
    },
  },
};

export type StepFailureStep = 'alert_retrieval' | 'generation' | 'validation';

/**
 * Emitted when an individual pipeline step fails during Attack Discovery
 * generation. Provides per-step failure visibility for fleet-wide debugging.
 */
export const ATTACK_DISCOVERY_STEP_FAILURE_EVENT: EventTypeOpts<{
  duration_ms?: number;
  error_category: ErrorCategory;
  execution_uuid?: string;
  step: StepFailureStep;
  workflow_id?: string;
}> = {
  eventType: 'attack_discovery_step_failure',
  schema: {
    duration_ms: {
      type: 'integer',
      _meta: {
        description: 'How long the step ran before failing, in milliseconds',
        optional: true,
      },
    },
    error_category: {
      type: 'keyword',
      _meta: {
        description:
          'Category of error (timeout, connector_error, workflow_error, validation_error, unknown)',
        optional: false,
      },
    },
    execution_uuid: {
      type: 'keyword',
      _meta: {
        description: 'Execution UUID that uniquely identifies this generation run',
        optional: true,
      },
    },
    step: {
      type: 'keyword',
      _meta: {
        description: 'Which pipeline step failed (alert_retrieval, generation, validation)',
        optional: false,
      },
    },
    workflow_id: {
      type: 'keyword',
      _meta: {
        description: 'Workflow ID that was being executed when the step failed',
        optional: true,
      },
    },
  },
};

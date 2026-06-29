/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryTelemetryEvent } from './types';
import { AttackDiscoveryEventTypes } from './types';

const workflowConfigSchema = {
  custom_retrieval_workflow_count: {
    type: 'integer',
    _meta: {
      description: 'Number of user-selected custom alert retrieval workflows',
      optional: false,
    },
  },
  alert_retrieval_mode: {
    type: 'keyword',
    _meta: {
      description: 'The alert retrieval mode (custom_query/esql/custom_only)',
      optional: false,
    },
  },
  query_mode: {
    type: 'keyword',
    _meta: {
      description: 'The query mode for default alert retrieval (custom_query/esql)',
      optional: false,
    },
  },
  uses_default_validation: {
    type: 'boolean',
    _meta: {
      description: 'Whether the default validation workflow is used',
      optional: false,
    },
  },
} as const;

export const attackDiscoverySettingsFlyoutOpenedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.SettingsFlyoutOpened,
  schema: {
    tab: {
      type: 'keyword',
      _meta: { description: 'The initial tab shown (settings/schedule)', optional: false },
    },
  },
};

export const attackDiscoverySettingsTabChangedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.SettingsTabChanged,
  schema: {
    tab: {
      type: 'keyword',
      _meta: { description: 'The tab switched to (settings/schedule)', optional: false },
    },
  },
};

export const attackDiscoverySettingsSavedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.SettingsSaved,
  schema: workflowConfigSchema,
};

export const attackDiscoverySettingsResetEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.SettingsReset,
  schema: {},
};

export const attackDiscoverySaveAndRunClickedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.SaveAndRunClicked,
  schema: workflowConfigSchema,
};

export const attackDiscoveryAlertRetrievalModeChangedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.AlertRetrievalModeChanged,
  schema: {
    mode: {
      type: 'keyword',
      _meta: {
        description: 'The alert retrieval mode selected (custom_query/esql/custom_only)',
        optional: false,
      },
    },
  },
};

export const attackDiscoveryQueryModeChangedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.QueryModeChanged,
  schema: {
    mode: {
      type: 'keyword',
      _meta: {
        description: 'The query mode selected (custom_query/esql)',
        optional: false,
      },
    },
  },
};

export const attackDiscoveryAlertRetrievalWorkflowsChangedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.AlertRetrievalWorkflowsChanged,
  schema: {
    workflow_count: {
      type: 'integer',
      _meta: {
        description: 'Number of custom alert retrieval workflows selected',
        optional: false,
      },
    },
  },
};

export const attackDiscoveryValidationWorkflowChangedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ValidationWorkflowChanged,
  schema: {
    is_default: {
      type: 'boolean',
      _meta: {
        description: 'Whether the default validation workflow was selected',
        optional: false,
      },
    },
  },
};

export const attackDiscoveryEditWithAiClickedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.EditWithAiClicked,
  schema: {},
};

export const attackDiscoveryScheduleCreateFlyoutOpenedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ScheduleCreateFlyoutOpened,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description: 'Where the create flyout was opened from (empty_state/schedule_tab)',
        optional: false,
      },
    },
  },
};

export const attackDiscoveryScheduleCreatedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ScheduleCreated,
  schema: {
    has_actions: {
      type: 'boolean',
      _meta: {
        description: 'Whether the schedule has notification actions configured',
        optional: false,
      },
    },
    interval: {
      type: 'keyword',
      _meta: { description: 'The schedule interval (e.g. 1h, 4h, 24h)', optional: false },
    },
  },
};

export const attackDiscoveryScheduleUpdatedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ScheduleUpdated,
  schema: {
    has_actions: {
      type: 'boolean',
      _meta: {
        description: 'Whether the schedule has notification actions configured',
        optional: false,
      },
    },
    interval: {
      type: 'keyword',
      _meta: { description: 'The schedule interval (e.g. 1h, 4h, 24h)', optional: false },
    },
  },
};

export const attackDiscoveryScheduleDeletedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ScheduleDeleted,
  schema: {},
};

export const attackDiscoveryScheduleEnabledEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ScheduleEnabled,
  schema: {},
};

export const attackDiscoveryScheduleDisabledEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ScheduleDisabled,
  schema: {},
};

export const attackDiscoveryGenerationStartedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.GenerationStarted,
  schema: {
    execution_mode: {
      type: 'keyword',
      _meta: {
        description: 'Whether the workflow-enabled or legacy execution path was used',
        optional: false,
      },
    },
    trigger: {
      type: 'keyword',
      _meta: {
        description: 'What triggered the generation (manual/save_and_run)',
        optional: false,
      },
    },
  },
};

export const attackDiscoveryExecutionDetailsOpenedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.ExecutionDetailsOpened,
  schema: {},
};

export const attackDiscoveryGenerationDismissedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.GenerationDismissed,
  schema: {},
};

export const attackDiscoveryPipelineStepInspectedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.PipelineStepInspected,
  schema: {
    step_type: {
      type: 'keyword',
      _meta: {
        description: 'The type of pipeline step inspected (alert_retrieval/generation/validation)',
        optional: false,
      },
    },
  },
};

export const attackDiscoveryTroubleshootWithAiClickedEvent: AttackDiscoveryTelemetryEvent = {
  eventType: AttackDiscoveryEventTypes.TroubleshootWithAiClicked,
  schema: {},
};

export const attackDiscoveryTelemetryEvents = [
  attackDiscoveryAlertRetrievalModeChangedEvent,
  attackDiscoveryAlertRetrievalWorkflowsChangedEvent,
  attackDiscoveryEditWithAiClickedEvent,
  attackDiscoveryExecutionDetailsOpenedEvent,
  attackDiscoveryGenerationDismissedEvent,
  attackDiscoveryGenerationStartedEvent,
  attackDiscoveryPipelineStepInspectedEvent,
  attackDiscoveryQueryModeChangedEvent,
  attackDiscoverySaveAndRunClickedEvent,
  attackDiscoveryScheduleCreateFlyoutOpenedEvent,
  attackDiscoveryScheduleCreatedEvent,
  attackDiscoveryScheduleDeletedEvent,
  attackDiscoveryScheduleDisabledEvent,
  attackDiscoveryScheduleEnabledEvent,
  attackDiscoveryScheduleUpdatedEvent,
  attackDiscoverySettingsFlyoutOpenedEvent,
  attackDiscoverySettingsResetEvent,
  attackDiscoverySettingsSavedEvent,
  attackDiscoverySettingsTabChangedEvent,
  attackDiscoveryTroubleshootWithAiClickedEvent,
  attackDiscoveryValidationWorkflowChangedEvent,
];

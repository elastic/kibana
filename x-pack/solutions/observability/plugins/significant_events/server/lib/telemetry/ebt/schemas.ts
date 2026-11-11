/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt/client';
import type {
  AlertCreationAttemptIdentityProps,
  ExistingAlertIdentityProps,
  AgentBuilderKnowledgeIndicatorCreatedProps,
  AgentToolEventCreateProps,
  AgentToolEventInvestigationAttachProps,
  AgentToolEventStatusUpdateProps,
  AgentToolKnowledgeIndicatorIdentificationStartedProps,
  DetectionScanProps,
  DiscoveryTriggeredProps,
  EventStatusChangedProps,
  KnowledgeIndicatorFeaturesIdentifiedProps,
  KnowledgeIndicatorQueriesGeneratedProps,
  KnowledgeIndicatorOnboardingScheduledProps,
  AgentToolEventWriteProps,
  AgentToolEventSearchProps,
  EbtTelemetryContext,
  OptionalWorkflowExecutionTelemetryProps,
  ParentWorkflowExecutionTelemetryProps,
  WorkflowExecutionTelemetryProps,
} from './types';

const ebtTelemetryContextSchema: RootSchema<EbtTelemetryContext> = {
  space_id: {
    type: 'keyword',
    _meta: { description: 'The Kibana space in which the operation ran' },
  },
  target_cluster_scope: {
    type: 'keyword',
    _meta: {
      description:
        'CPS target scope: origin for operations limited to the Nightshift project, or all for operations spanning linked projects',
      optional: true,
    },
  },
  target_cluster_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'An opaque serverless project ID' },
    },
    _meta: {
      description:
        'Stable opaque IDs of the Elasticsearch projects targeted by this operation; only present when CPS is enabled',
      optional: true,
    },
  },
  target_cluster_ids_complete: {
    type: 'boolean',
    _meta: {
      description:
        'Whether target_cluster_ids includes every project in the target scope visible to the request',
      optional: true,
    },
  },
};

const workflowExecutionTelemetrySchema: RootSchema<WorkflowExecutionTelemetryProps> = {
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Workflow Engine execution ID of the workflow that produced the event; joins to Workflow Engine terminal telemetry',
    },
  },
};

const optionalWorkflowExecutionTelemetrySchema: RootSchema<OptionalWorkflowExecutionTelemetryProps> =
  {
    workflow_execution_id: {
      type: 'keyword',
      _meta: {
        description:
          'Workflow Engine execution ID that produced the event; absent for standalone invocations',
        optional: true,
      },
    },
  };

const parentWorkflowExecutionTelemetrySchema: RootSchema<ParentWorkflowExecutionTelemetryProps> = {
  parent_workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Execution ID of the workflow that started the producing workflow via workflow.execute (the onboarding run for KI children); joins to onboarding-scheduled workflow_execution_id; absent for top-level or standalone runs',
      optional: true,
    },
  },
};

const knowledgeIndicatorQueriesGeneratedSchema: RootSchema<KnowledgeIndicatorQueriesGeneratedProps> =
  {
    ...ebtTelemetryContextSchema,
    ...optionalWorkflowExecutionTelemetrySchema,
    ...parentWorkflowExecutionTelemetrySchema,
    count: {
      type: 'long',
      _meta: {
        description: 'The number of significant events queries generated',
      },
    },
    connector_id: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the LLM connector used for the inference',
      },
    },
    input_tokens_used: {
      type: 'long',
      _meta: {
        description: 'The number of input tokens used for the generation request',
      },
    },
    output_tokens_used: {
      type: 'long',
      _meta: {
        description: 'The number of output tokens used for the generation request',
      },
    },
    cached_tokens_used: {
      type: 'long',
      _meta: {
        description: 'Cached tokens used for the generation request',
      },
    },
    duration_ms: {
      type: 'long',
      _meta: {
        description: 'Duration of the query generation operation in milliseconds',
      },
    },
    source_id: {
      type: 'keyword',
      _meta: {
        description: 'The nightshift source id the queries were generated for',
      },
    },
    external_content_tool_continuations: {
      type: 'long',
      _meta: {
        description:
          'Reasoning turns that contained external content and pending task tools and were correctly continued',
        optional: true,
      },
    },
    tool_usage: {
      _meta: {
        description: 'Tool usage statistics for the inference steps',
        optional: true,
      },
      properties: {
        get_stream_features: {
          properties: {
            calls: {
              type: 'long',
              _meta: {
                description: 'The number of calls to the get_stream_features tool',
              },
            },
            failures: {
              type: 'long',
              _meta: {
                description: 'The number of failures to the get_stream_features tool',
              },
            },
            latency_ms: {
              type: 'long',
              _meta: {
                description: 'The latency of the get_stream_features tool in milliseconds',
              },
            },
          },
        },
        add_queries: {
          properties: {
            calls: {
              type: 'long',
              _meta: {
                description: 'The number of calls to the add_queries tool',
              },
            },
            failures: {
              type: 'long',
              _meta: {
                description: 'The number of failures to the add_queries tool',
              },
            },
            latency_ms: {
              type: 'long',
              _meta: {
                description: 'The latency of the add_queries tool in milliseconds',
              },
            },
          },
        },
      },
    },
  };

const knowledgeIndicatorFeaturesIdentifiedSchema: RootSchema<KnowledgeIndicatorFeaturesIdentifiedProps> =
  {
    ...ebtTelemetryContextSchema,
    ...optionalWorkflowExecutionTelemetrySchema,
    ...parentWorkflowExecutionTelemetrySchema,
    run_id: {
      type: 'keyword',
      _meta: {
        description:
          'Legacy feature-identification run ID; equals workflow_execution_id for workflow invocations',
      },
    },
    connector_id: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the LLM connector used for the inference',
      },
    },
    iteration: {
      type: 'long',
      _meta: {
        description: 'Iteration number (1-based); 0 for terminal failure/cancel events',
      },
    },
    docs_count: {
      type: 'long',
      _meta: {
        description: 'Number of documents used in this iteration',
      },
    },
    features_new: {
      type: 'long',
      _meta: {
        description: 'New features identified in this iteration',
      },
    },
    features_updated: {
      type: 'long',
      _meta: {
        description: 'Existing features updated in this iteration',
      },
    },
    features_remapped: {
      type: 'long',
      _meta: {
        description: 'Features remapped to a previously known id in this iteration',
      },
    },
    input_tokens_used: {
      type: 'long',
      _meta: {
        description: 'Input tokens used in this iteration',
      },
    },
    output_tokens_used: {
      type: 'long',
      _meta: {
        description: 'Output tokens used in this iteration',
      },
    },
    total_tokens_used: {
      type: 'long',
      _meta: {
        description: 'Total tokens used in this iteration',
      },
    },
    excluded_features_count: {
      type: 'long',
      _meta: {
        description: 'The number of excluded features present at the time of identification',
      },
    },
    llm_ignored_count: {
      type: 'long',
      _meta: {
        description: 'The number of features the LLM reported as matching excluded features',
      },
    },
    code_ignored_count: {
      type: 'long',
      _meta: {
        description:
          'The number of inferred features dropped server-side because they matched excluded features',
      },
    },
    cached_tokens_used: {
      type: 'long',
      _meta: {
        description: 'Cached tokens used in this iteration',
      },
    },
    duration_ms: {
      type: 'long',
      _meta: {
        description: 'Duration of this iteration in milliseconds',
      },
    },
    source_id: {
      type: 'keyword',
      _meta: {
        description: 'The nightshift source id the features were identified for',
      },
    },
    state: {
      type: 'keyword',
      _meta: {
        description:
          'The state of the features identification task (success, failure, or canceled)',
      },
    },
    filters_capped: {
      type: 'boolean',
      _meta: {
        description: 'Whether the filters were capped',
      },
    },
    total_filters: {
      type: 'long',
      _meta: {
        description: 'The total number of filters available in features',
      },
    },
    has_filtered_documents: {
      type: 'boolean',
      _meta: {
        description: 'Whether the sample query found documents after filters were applied',
      },
    },
  };

const agentBuilderKnowledgeIndicatorCreatedSchema: RootSchema<AgentBuilderKnowledgeIndicatorCreatedProps> =
  {
    ...ebtTelemetryContextSchema,
    ...optionalWorkflowExecutionTelemetrySchema,
    ki_kind: {
      type: 'keyword',
      _meta: {
        description: 'The kind of KI created by the agent builder tool: feature or query',
      },
    },
    tool_id: {
      type: 'keyword',
      _meta: {
        description: 'The tool that created the KI',
      },
    },
    success: {
      type: 'boolean',
      _meta: {
        description: 'Whether KI creation succeeded',
      },
    },
    source_id: {
      type: 'keyword',
      _meta: {
        description: 'The nightshift source id the knowledge indicator was created for',
      },
    },
    space_id: {
      type: 'keyword',
      _meta: {
        description: 'The Kibana space that owns the knowledge indicator',
      },
    },
    knowledge_indicator_id: {
      type: 'keyword',
      _meta: {
        description:
          'The `feature.id` or `query.id` the write addressed, unique within `source_id`; absent only when a failed query write had no caller-supplied id',
        optional: true,
      },
    },
    error_message: {
      type: 'text',
      _meta: {
        description: 'Error message when KI creation fails',
        optional: true,
      },
    },
  };

const agentToolKnowledgeIndicatorIdentificationStartedSchema: RootSchema<AgentToolKnowledgeIndicatorIdentificationStartedProps> =
  {
    ...ebtTelemetryContextSchema,
    ...optionalWorkflowExecutionTelemetrySchema,
    success: {
      type: 'boolean',
      _meta: {
        description: 'Whether starting KI identification succeeded',
      },
    },
    source_id: {
      type: 'keyword',
      _meta: {
        description: 'The nightshift source id identification was started for',
      },
    },
    error_message: {
      type: 'text',
      _meta: {
        description: 'Error message when KI identification start fails',
        optional: true,
      },
    },
  };

const alertSourceSchema = {
  type: 'keyword' as const,
  _meta: {
    description:
      'The `.rule-events` `source` of the alert: `internal` for Elastic-configured Alerting v2 rules, an `elastic.`-prefixed value for Elastic-produced alerts, or the sender-supplied value for external alerts',
  },
};

const fingerprintDescription =
  'The stable caller-visible series identity of the alert the operation addressed, before Alerting v2 hashes it with space and source into `group_hash`. The operation may have failed; filter on `success` to keep only alerts that exist in `.rule-events`';

const groupHashSchema = {
  type: 'keyword' as const,
  _meta: {
    description:
      'The Alerting v2 `group_hash` series key returned by the write that created the alert. Absent when the operation did not create it',
    optional: true as const,
  },
};

const existingAlertIdentitySchema: RootSchema<ExistingAlertIdentityProps> = {
  ...ebtTelemetryContextSchema,
  alert_source: alertSourceSchema,
  fingerprint: { type: 'keyword', _meta: { description: fingerprintDescription } },
};

const alertCreationAttemptIdentitySchema: RootSchema<AlertCreationAttemptIdentityProps> = {
  ...ebtTelemetryContextSchema,
  alert_source: alertSourceSchema,
  fingerprint: {
    type: 'keyword',
    _meta: {
      description: `${fingerprintDescription}. Absent when the server generated the id for an event it did not persist`,
      optional: true,
    },
  },
  group_hash: groupHashSchema,
};

const agentToolEventCreateSchema: RootSchema<AgentToolEventCreateProps> = {
  ...optionalWorkflowExecutionTelemetrySchema,
  ...alertCreationAttemptIdentitySchema,
  success: {
    type: 'boolean',
    _meta: {
      description: 'Whether the event creation succeeded',
    },
  },
  source_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'A nightshift source id',
      },
    },
    _meta: {
      description: 'The nightshift source ids associated with the event',
    },
  },
  error_message: {
    type: 'text',
    _meta: {
      description: 'Error message when event creation fails',
      optional: true,
    },
  },
};

const agentToolEventStatusUpdateSchema: RootSchema<AgentToolEventStatusUpdateProps> = {
  ...optionalWorkflowExecutionTelemetrySchema,
  ...existingAlertIdentitySchema,
  success: {
    type: 'boolean',
    _meta: {
      description: 'Whether the event status update succeeded',
    },
  },
  event_uuid: {
    type: 'keyword',
    _meta: {
      description:
        'Deprecated — superseded by `event_id`. The identifier of the updated significant event',
      optional: true,
    },
  },
  event_id: {
    type: 'keyword',
    _meta: {
      description:
        'The stable event id of the updated significant event; the same value as `fingerprint`, kept for compatibility',
    },
  },
  status: {
    type: 'keyword',
    _meta: {
      description: 'The status value set on the significant event',
    },
  },
  error_message: {
    type: 'text',
    _meta: {
      description: 'Error message when event status update fails',
      optional: true,
    },
  },
};

const eventStatusChangedSchema: RootSchema<EventStatusChangedProps> = {
  ...existingAlertIdentitySchema,
  entity_type: {
    type: 'keyword',
    _meta: {
      description: 'The kind of entity whose status changed; always `significant_event` here',
    },
  },
  previous_status: {
    type: 'keyword',
    _meta: {
      description:
        'Status of the stored version before this write (active, recovering or inactive); absent when this write created the event',
      optional: true,
    },
  },
  status: {
    type: 'keyword',
    _meta: {
      description: 'Status stored on the written version (active, recovering or inactive)',
    },
  },
  actor: {
    type: 'keyword',
    _meta: {
      description:
        'The entry point that wrote the version: `agent_tool` (an Agent Builder tool, in discovery or chat), `rest_api` (the event update route, which the UI calls) or `stale_event_cleanup` (the cleanup that closes events whose rule was deleted). It names the code path, not whether a person was behind it',
    },
  },
  change_kind: {
    type: 'keyword',
    _meta: {
      description:
        'How the status was decided: `operator` (a status chosen through the update route or a chat tool), `assessment` (discovery re-checked the member signals) or `rule_deleted`. Absent when the writer supplied the status itself, as `event_create` does. An `operator` deactivation is a manual close; `close_reason` says why when the caller stated it',
      optional: true,
    },
  },
  assessment_outcome: {
    type: 'keyword',
    _meta: {
      description:
        'For `change_kind: assessment`, what the member signals said: `breached`, `recovered` or `no_data`',
      optional: true,
    },
  },
  close_reason: {
    type: 'keyword',
    _meta: {
      description:
        'Why an operator set the event inactive: `resolved` (a real problem that is over) or `dismissed` (noise, not worth surfacing). Absent when the caller did not state it and on every other change',
      optional: true,
    },
  },
  severity: {
    type: 'keyword',
    _meta: {
      description: 'Severity tier stored on the written version',
    },
  },
  confidence: {
    type: 'float',
    _meta: {
      description: 'Confidence stored on the written version, between 0 and 1',
    },
  },
  signal_count: {
    type: 'long',
    _meta: {
      description:
        'Correlation fan-in: the number of signals stored on the written version, one per member rule',
    },
  },
  confirmed_signal_count: {
    type: 'long',
    _meta: {
      description: 'The number of stored signals whose verdict confirms the event',
    },
  },
  source_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'A Nightshift source id',
      },
    },
    _meta: {
      description: 'The Nightshift source ids the event covers',
    },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'The workflow execution stored on the written version, when a workflow wrote it; joins the discovery run and the workflow engine events',
      optional: true,
    },
  },
};

const discoveryTriggeredSchema: RootSchema<DiscoveryTriggeredProps> = {
  ...ebtTelemetryContextSchema,
  ...workflowExecutionTelemetrySchema,
  execution_id: {
    type: 'keyword' as const,
    _meta: {
      description:
        'Deprecated alias of workflow_execution_id; retained for discovery-triggered compatibility',
    },
  },
};

const detectionScanSchema: RootSchema<DetectionScanProps> = {
  ...ebtTelemetryContextSchema,
  ...optionalWorkflowExecutionTelemetrySchema,
  took_ms: {
    type: 'long',
    _meta: {
      description: 'ES `took` (ms) reported by the alerts-source search for the change-point scan',
    },
  },
  duration_ms: {
    type: 'long',
    _meta: {
      description:
        'Wall-clock duration (ms) of the change-point scan read, including transport and parsing',
    },
  },
  rules_requested: {
    type: 'long',
    _meta: {
      description: 'Rule-backed queries requested for the scan (all analysis profiles)',
    },
  },
  rules_scanned: {
    type: 'long',
    _meta: {
      description: 'Distinct rules that returned a change-point series bucket',
    },
  },
  critical_rule_count: {
    type: 'long',
    _meta: {
      description: 'Rule-backed query count on the critical analysis profile',
    },
  },
  default_rule_count: {
    type: 'long',
    _meta: {
      description: 'Rule-backed query count on the default analysis profile',
    },
  },
  alerting_engine: {
    type: 'keyword',
    _meta: {
      description: 'Alerting engine backing the read; Significant Events always uses v2',
    },
  },
  alerts_source_index: {
    type: 'keyword',
    _meta: {
      description: 'The alerts-source index that was read (e.g. `.rule-events`)',
    },
  },
  lookback: {
    type: 'keyword',
    _meta: {
      description: 'Critical analysis lookback duration (e.g. `now-40m`)',
    },
  },
  bucket_interval: {
    type: 'keyword',
    _meta: {
      description: 'Critical analysis outer bucket interval (e.g. `1m`)',
    },
  },
  default_lookback: {
    type: 'keyword',
    _meta: {
      description: 'Default analysis lookback duration (e.g. `now-125m`)',
    },
  },
  default_bucket_interval: {
    type: 'keyword',
    _meta: {
      description: 'Default analysis outer bucket interval (e.g. `5m`)',
    },
  },
};

const onboardingScheduledSchema: RootSchema<KnowledgeIndicatorOnboardingScheduledProps> = {
  ...ebtTelemetryContextSchema,
  ...workflowExecutionTelemetrySchema,
  source_id: {
    type: 'keyword',
    _meta: {
      description: 'The nightshift source id being onboarded',
    },
  },
  execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Deprecated alias of workflow_execution_id; retained for onboarding-scheduled compatibility',
    },
  },
  workflow_id: {
    type: 'keyword',
    _meta: {
      description: 'The managed workflow ID that was triggered (system-streams-ki-onboarding)',
    },
  },
  skip_features: {
    type: 'boolean',
    _meta: {
      description: 'Whether the features identification step was skipped for this run',
    },
  },
  skip_queries: {
    type: 'boolean',
    _meta: {
      description: 'Whether the queries generation step was skipped for this run',
    },
  },
};

const agentToolEventInvestigationAttachSchema: RootSchema<AgentToolEventInvestigationAttachProps> =
  {
    ...optionalWorkflowExecutionTelemetrySchema,
    ...existingAlertIdentitySchema,
    success: {
      type: 'boolean',
      _meta: {
        description: 'Whether the investigation attachment succeeded',
      },
    },
    event_uuid: {
      type: 'keyword',
      _meta: {
        description:
          'Deprecated — superseded by `event_id`. The identifier of the significant event the investigation was attached to',
        optional: true,
      },
    },
    event_id: {
      type: 'keyword',
      _meta: {
        description:
          'The stable event id of the significant event the investigation was attached to; the same value as `fingerprint`, kept for compatibility',
        optional: true,
      },
    },
    investigation_id: {
      type: 'keyword',
      _meta: {
        description:
          'Agent Builder conversation ID of the attached investigation; joins to nightshift-investigation-started.investigation_id',
      },
    },
    error_message: {
      type: 'text',
      _meta: {
        description: 'Error message when investigation attachment fails',
        optional: true,
      },
    },
  };

const agentToolEventWriteSchema: RootSchema<AgentToolEventWriteProps> = {
  ...optionalWorkflowExecutionTelemetrySchema,
  ...alertCreationAttemptIdentitySchema,
  success: {
    type: 'boolean',
    _meta: {
      description: 'Whether the workflow event write succeeded',
    },
  },
  event_id: {
    type: 'keyword',
    _meta: {
      description:
        'The stable event id associated with the written event, or `unknown` when the item had none; kept for compatibility, join on `fingerprint` instead',
    },
  },
  status: {
    type: 'keyword',
    _meta: {
      description: 'The status value set on the significant event',
      optional: true,
    },
  },
  written: {
    type: 'boolean',
    _meta: {
      description: 'Whether a new event version was actually written (false when status unchanged)',
    },
  },
  source_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'A nightshift source id',
      },
    },
    _meta: {
      description: 'The nightshift source ids associated with the event',
    },
  },
  detection_workflow_execution_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'A detection workflow execution ID',
      },
    },
    _meta: {
      description:
        'Distinct workflow_execution_id values of the stored detections behind the signals; joins discovery to the detection runs it consumed. Absent when no signal names a stored detection',
      optional: true,
    },
  },
  error_message: {
    type: 'text',
    _meta: {
      description: 'Error message when the workflow event write fails',
      optional: true,
    },
  },
  severity: {
    type: 'keyword',
    _meta: {
      description: 'The severity tier actually stored. Present only when written is true.',
      optional: true,
    },
  },
};

const agentToolEventSearchSchema: RootSchema<AgentToolEventSearchProps> = {
  ...ebtTelemetryContextSchema,
  ...optionalWorkflowExecutionTelemetrySchema,
  success: {
    type: 'boolean',
    _meta: {
      description: 'Whether the event search succeeded',
    },
  },
  result_count: {
    type: 'long',
    _meta: {
      description: 'The number of significant events returned by the search',
    },
  },
  has_query: {
    type: 'boolean',
    _meta: {
      description: 'Whether the search included a query filter',
    },
  },
  has_source_filter: {
    type: 'boolean',
    _meta: {
      description: 'Whether the search included a source_ids filter',
    },
  },
  status_filter: {
    type: 'keyword',
    _meta: {
      description: 'The state filter applied to the search (open or closed)',
      optional: true,
    },
  },
  view: {
    type: 'keyword',
    _meta: {
      description: 'The requested event response view (compact or full)',
    },
  },
  page: {
    type: 'long',
    _meta: {
      description: 'The requested event search page',
    },
  },
  error_message: {
    type: 'text',
    _meta: {
      description: 'Error message when the event search fails',
      optional: true,
    },
  },
};

export {
  agentBuilderKnowledgeIndicatorCreatedSchema,
  agentToolEventCreateSchema,
  agentToolEventInvestigationAttachSchema,
  agentToolEventSearchSchema,
  agentToolEventStatusUpdateSchema,
  agentToolEventWriteSchema,
  agentToolKnowledgeIndicatorIdentificationStartedSchema,
  detectionScanSchema,
  discoveryTriggeredSchema,
  eventStatusChangedSchema,
  knowledgeIndicatorFeaturesIdentifiedSchema,
  knowledgeIndicatorQueriesGeneratedSchema,
  onboardingScheduledSchema,
};

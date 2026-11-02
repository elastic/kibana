/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt/client';
import type {
  AgentBuilderKnowledgeIndicatorCreatedProps,
  AgentToolEventCreateProps,
  AgentToolEventStatusUpdateProps,
  AgentToolKnowledgeIndicatorIdentificationStartedProps,
  AlertIdentityProps,
  DetectionScanProps,
  EventStatusChangedProps,
  KnowledgeIndicatorFeaturesIdentifiedProps,
  KnowledgeIndicatorQueriesGeneratedProps,
  KnowledgeIndicatorOnboardingScheduledProps,
  AgentToolEventWriteProps,
  AgentToolEventSearchProps,
} from './types';

/** Fields every alert-level event carries, so metrics split by source and join by fingerprint. */
const alertIdentitySchema: RootSchema<AlertIdentityProps> = {
  alert_source: {
    type: 'keyword',
    _meta: {
      description:
        'The `source` of the alert document in `.rule-events`. Significant Events write `elastic.significant_events`. Named `alert_source` to not collide with `source_id`/`source_ids` (Nightshift query sources).',
    },
  },
  fingerprint: {
    type: 'keyword',
    _meta: {
      description:
        'The alert `fingerprint` in `.rule-events`, which for a Significant Event is its stable `event_id`. Joins every event about the same alert.',
    },
  },
  space_id: {
    type: 'keyword',
    _meta: {
      description: 'The Kibana space the alert lives in',
    },
  },
};

const knowledgeIndicatorQueriesGeneratedSchema: RootSchema<KnowledgeIndicatorQueriesGeneratedProps> =
  {
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
        description: 'The Nightshift source id the queries were generated for',
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
    run_id: {
      type: 'keyword',
      _meta: {
        description: 'UUID identifying the full identification run (shared across iterations)',
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
        description: 'The Nightshift source id the features were identified for',
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
        description: 'The Nightshift source id the knowledge indicator was created for',
      },
    },
    knowledge_indicator_id: {
      type: 'keyword',
      _meta: {
        description:
          'The id of the created knowledge indicator (`feature.id` or `query.id`); absent when creation failed',
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
    success: {
      type: 'boolean',
      _meta: {
        description: 'Whether starting KI identification succeeded',
      },
    },
    source_id: {
      type: 'keyword',
      _meta: {
        description: 'The Nightshift source id identification was started for',
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

const agentToolEventCreateSchema: RootSchema<AgentToolEventCreateProps> = {
  ...alertIdentitySchema,
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
        description: 'A Nightshift source id',
      },
    },
    _meta: {
      description: 'The Nightshift source ids associated with the event',
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
  ...alertIdentitySchema,
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
        'The stable event id of the updated significant event; the same value as `fingerprint`',
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
  ...alertIdentitySchema,
  entity_type: {
    type: 'keyword',
    _meta: {
      description:
        'The kind of entity whose status changed; always `significant_event` for this event type',
    },
  },
  previous_status: {
    type: 'keyword',
    _meta: {
      description:
        'Status of the latest stored version before this write (active, recovering or inactive); absent when this write created the event',
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
        'Who caused the write: `agent` (discovery or chat agent), `human` (operator update) or `system` (maintenance, e.g. rule deletion)',
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
        'The workflow execution that produced this version, when written by a workflow; joins the discovery run and workflow engine events',
      optional: true,
    },
  },
};

const discoveryTriggeredSchema = {
  execution_id: {
    type: 'keyword' as const,
    _meta: { description: 'The workflow execution ID returned by the orchestrator' },
  },
  space_id: {
    type: 'keyword' as const,
    _meta: { description: 'The Kibana space in which the pipeline was triggered' },
  },
};

const detectionScanSchema: RootSchema<DetectionScanProps> = {
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
  space_id: {
    type: 'keyword',
    _meta: {
      description: 'The Kibana space in which the scan ran',
    },
  },
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'The detection workflow execution that requested the scan; absent when the route was called directly',
      optional: true,
    },
  },
};

const onboardingScheduledSchema: RootSchema<KnowledgeIndicatorOnboardingScheduledProps> = {
  source_id: {
    type: 'keyword',
    _meta: {
      description: 'The Nightshift source id being onboarded',
    },
  },
  execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'The workflow execution ID for this onboarding run; join key to workflow_execution_completed/_failed/_cancelled engine events and to streams-features-identified / streams-significant-events-queries-generated events',
    },
  },
  workflow_id: {
    type: 'keyword',
    _meta: {
      description: 'The managed workflow ID that was triggered (system-streams-ki-onboarding)',
    },
  },
  space_id: {
    type: 'keyword',
    _meta: {
      description: 'The Kibana space in which the workflow execution was created',
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

const agentToolEventWriteSchema: RootSchema<AgentToolEventWriteProps> = {
  ...alertIdentitySchema,
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
        'The stable event id associated with the written event; the same value as `fingerprint`',
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
        description: 'A Nightshift source id',
      },
    },
    _meta: {
      description: 'The Nightshift source ids associated with the event',
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
  workflow_execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'The discovery workflow execution the agent wrote on behalf of, when the item carried one',
      optional: true,
    },
  },
};

const agentToolEventSearchSchema: RootSchema<AgentToolEventSearchProps> = {
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

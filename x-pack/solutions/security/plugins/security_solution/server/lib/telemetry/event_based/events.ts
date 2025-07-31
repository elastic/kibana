/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/core/server';
import type { BulkUpsertAssetCriticalityRecordsResponse } from '../../../../common/api/entity_analytics';
import type {
  ResponseActionAgentType,
  ResponseActionStatus,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import type {
  DataStreams,
  IlmPolicies,
  IlmsStats,
  IndexTemplatesStats,
  IndicesSettings,
  IndicesStats,
} from '../indices.metadata.types';
import type { NodeIngestPipelinesStats } from '../ingest_pipelines_stats.types';
import { SiemMigrationsEventTypes } from './types';

export const RISK_SCORE_EXECUTION_SUCCESS_EVENT: EventTypeOpts<{
  scoresWritten: number;
  taskDurationInSeconds: number;
  interval: string;
  alertSampleSizePerShard: number;
}> = {
  eventType: 'risk_score_execution_success',
  schema: {
    scoresWritten: {
      type: 'long',
      _meta: {
        description: 'Number of risk scores written during this scoring task execution',
      },
    },
    taskDurationInSeconds: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the current risk scoring task execution',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: `Configured interval for the current risk scoring task`,
      },
    },
    alertSampleSizePerShard: {
      type: 'long',
      _meta: {
        description: `Number of alerts to sample per shard for the current risk scoring task`,
      },
    },
  },
};

export const RISK_SCORE_EXECUTION_ERROR_EVENT: EventTypeOpts<{}> = {
  eventType: 'risk_score_execution_error',
  schema: {},
};

export const RISK_SCORE_EXECUTION_CANCELLATION_EVENT: EventTypeOpts<{
  scoresWritten: number;
  taskDurationInSeconds: number;
  interval: string;
  alertSampleSizePerShard: number;
}> = {
  eventType: 'risk_score_execution_cancellation',
  schema: {
    scoresWritten: {
      type: 'long',
      _meta: {
        description: 'Number of risk scores written during this scoring task execution',
      },
    },
    taskDurationInSeconds: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the current risk scoring task execution',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: `Configured interval for the current risk scoring task`,
      },
    },
    alertSampleSizePerShard: {
      type: 'long',
      _meta: {
        description: `Number of alerts to sample per shard for the current risk scoring task`,
      },
    },
  },
};

interface AssetCriticalitySystemProcessedAssignmentFileEvent {
  processing: {
    startTime: string;
    endTime: string;
    tookMs: number;
  };
  result?: BulkUpsertAssetCriticalityRecordsResponse['stats'];
  status: 'success' | 'partial_success' | 'fail';
}

export const ASSET_CRITICALITY_SYSTEM_PROCESSED_ASSIGNMENT_FILE_EVENT: EventTypeOpts<AssetCriticalitySystemProcessedAssignmentFileEvent> =
  {
    eventType: 'Asset Criticality Csv Upload Processed',
    schema: {
      processing: {
        properties: {
          startTime: { type: 'date', _meta: { description: 'Processing start time' } },
          endTime: { type: 'date', _meta: { description: 'Processing end time' } },
          tookMs: { type: 'long', _meta: { description: 'How long processing took ms' } },
        },
      },
      result: {
        properties: {
          successful: {
            type: 'long',
            _meta: { description: 'Number of criticality records successfully created or updated' },
          },
          failed: {
            type: 'long',
            _meta: { description: 'Number of criticality records which had errors' },
          },
          total: { type: 'long', _meta: { description: 'Total number of lines in the file' } },
        },
      },
      status: {
        type: 'keyword',
        _meta: { description: 'Status of the processing either success, partial_success or fail' },
      },
    },
  };

export const FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT: EventTypeOpts<{
  duration: number;
  interval: string;
}> = {
  eventType: 'field_retention_enrich_policy_execution',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the field retention enrich policy execution time',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: 'Configured interval for the field retention enrich policy task',
      },
    },
  },
};

export const ENTITY_STORE_DATA_VIEW_REFRESH_EXECUTION_EVENT: EventTypeOpts<{
  duration: number;
  interval: string;
}> = {
  eventType: 'entity_store_data_view_refresh_execution_event',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the entity store data view refresh execution time',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: 'Configured interval for the entity store data view refresh task',
      },
    },
  },
};

export const ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT: EventTypeOpts<{
  error: string;
}> = {
  eventType: 'entity_engine_resource_init_failure',
  schema: {
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for a resource initialization failure',
      },
    },
  },
};

export const ENTITY_ENGINE_INITIALIZATION_EVENT: EventTypeOpts<{
  duration: number;
}> = {
  eventType: 'entity_engine_initialization',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the entity engine initialization',
      },
    },
  },
};

export const ENTITY_STORE_USAGE_EVENT: EventTypeOpts<{
  storeSize: number;
}> = {
  eventType: 'entity_store_usage',
  schema: {
    storeSize: {
      type: 'long',
      _meta: {
        description: 'Number of entities stored in the entity store',
      },
    },
  },
};

export const PRIVMON_ENGINE_INITIALIZATION_EVENT: EventTypeOpts<{
  duration: number;
}> = {
  eventType: 'privmon_engine_initialization',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the privilege monitoring engine initialization',
      },
    },
  },
};

export const PRIVMON_ENGINE_RESOURCE_INIT_FAILURE_EVENT: EventTypeOpts<{
  error: string;
}> = {
  eventType: 'privmon_engine_resource_init_failure',
  schema: {
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for a resource initialization failure',
      },
    },
  },
};

export const ALERT_SUPPRESSION_EVENT: EventTypeOpts<{
  suppressionAlertsCreated: number;
  suppressionAlertsSuppressed: number;
  suppressionRuleName: string;
  suppressionDuration: number;
  suppressionGroupByFieldsNumber: number;
  suppressionGroupByFields: string[];
  suppressionRuleType: string;
  suppressionMissingFields: boolean;
  suppressionRuleId: string;
}> = {
  eventType: 'alert_suppression_on_rule_execution',
  schema: {
    suppressionAlertsCreated: {
      type: 'long',
      _meta: {
        description:
          'Number of alerts created during rule execution with configured alert suppression',
      },
    },
    suppressionAlertsSuppressed: {
      type: 'long',
      _meta: {
        description:
          'Number of alerts suppressed during rule execution with configured alert suppression',
      },
    },
    suppressionRuleName: {
      type: 'keyword',
      _meta: {
        description: 'Name of rule',
      },
    },
    suppressionDuration: {
      type: 'long',
      _meta: {
        description: 'Duration in seconds of suppression period. -1 for per rule execution config',
      },
    },
    suppressionGroupByFieldsNumber: {
      type: 'long',
      _meta: {
        description: 'Number of Suppress by fields',
      },
    },
    suppressionGroupByFields: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Tag attached to the element...',
          optional: false,
        },
      },
      _meta: {
        description: 'List of tags attached to the element...',
        optional: false,
      },
    },
    suppressionRuleType: {
      type: 'keyword',
      _meta: {
        description: 'Rule type',
      },
    },
    suppressionMissingFields: {
      type: 'boolean',
      _meta: {
        description: 'Suppression of missing fields enabled',
      },
    },
    suppressionRuleId: {
      type: 'keyword',
      _meta: {
        description: 'ruleId',
      },
    },
  },
};

export const TELEMETRY_DATA_STREAM_EVENT: EventTypeOpts<DataStreams> = {
  eventType: 'telemetry_data_stream_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          datastream_name: {
            type: 'keyword',
            _meta: { description: 'Name of the data stream' },
          },
          ilm_policy: {
            type: 'keyword',
            _meta: { optional: true, description: 'ILM policy associated to the datastream' },
          },
          template: {
            type: 'keyword',
            _meta: { optional: true, description: 'Template associated to the datastream' },
          },
          indices: {
            type: 'array',
            items: {
              properties: {
                index_name: { type: 'date', _meta: { description: 'Index name' } },
                ilm_policy: { type: 'date', _meta: { optional: true, description: 'ILM policy' } },
              },
            },
            _meta: { optional: true, description: 'Indices associated with the data stream' },
          },
        },
      },
      _meta: { description: 'Datastream settings' },
    },
  },
};

export const TELEMETRY_INDEX_STATS_EVENT: EventTypeOpts<IndicesStats> = {
  eventType: 'telemetry_index_stats_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index being monitored.' },
          },

          query_total: {
            type: 'long',
            _meta: {
              optional: true,
              description: 'The total number of search queries executed on the index.',
            },
          },
          query_time_in_millis: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total time spent on query execution across all search requests, measured in milliseconds.',
            },
          },

          docs_count_primaries: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents currently stored in the index (primary shards).',
            },
          },
          docs_deleted_primaries: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents that have been marked as deleted in the index (primary shards).',
            },
          },
          docs_total_size_in_bytes_primaries: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total size, in bytes, of all documents stored in the index, including storage overhead (primary shards).',
            },
          },

          docs_count: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents currently stored in the index (primary and replica shards).',
            },
          },
          docs_deleted: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents that have been marked as deleted in the index (primary and replica shards).',
            },
          },
          docs_total_size_in_bytes: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total size, in bytes, of all documents stored in the index, including storage overhead (primary and replica shards).',
            },
          },

          index_failed: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents failed to index (primary and replica shards).',
            },
          },
          index_failed_due_to_version_conflict: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents failed to index due to version conflict (primary and replica shards).',
            },
          },
        },
      },
      _meta: { description: 'Index stats' },
    },
  },
};

export const TELEMETRY_INDEX_SETTINGS_EVENT: EventTypeOpts<IndicesSettings> = {
  eventType: 'telemetry_index_settings_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index.' },
          },
          index_mode: {
            type: 'keyword',
            _meta: { optional: true, description: 'Index mode.' },
          },
          source_mode: {
            type: 'keyword',
            _meta: { optional: true, description: 'Source mode.' },
          },
          default_pipeline: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Pipeline applied if no pipeline parameter specified when indexing.',
            },
          },
          final_pipeline: {
            type: 'keyword',
            _meta: {
              optional: true,
              description:
                'Pipeline applied to the document at the end of the indexing process, after the document has been indexed.',
            },
          },
        },
      },
      _meta: { description: 'Index settings' },
    },
  },
};

export const TELEMETRY_ILM_POLICY_EVENT: EventTypeOpts<IlmPolicies> = {
  eventType: 'telemetry_ilm_policy_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          policy_name: {
            type: 'keyword',
            _meta: { description: 'The name of the ILM policy.' },
          },
          modified_date: {
            type: 'date',
            _meta: { description: 'The date when the ILM policy was last modified.' },
          },
          phases: {
            properties: {
              cold: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "cold" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "cold" phase of the ILM policy, applied when data is infrequently accessed.',
                },
              },
              delete: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "delete" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "delete" phase of the ILM policy, specifying when the index should be removed.',
                },
              },
              frozen: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "frozen" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "frozen" phase of the ILM policy, where data is fully searchable but stored with a reduced resource footprint.',
                },
              },
              hot: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "hot" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "hot" phase of the ILM policy, applied to actively written and queried data.',
                },
              },
              warm: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "warm" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "warm" phase of the ILM policy, used for read-only data that is less frequently accessed.',
                },
              },
            },
            _meta: {
              description:
                'The different phases of the ILM policy that define how the index is managed over time.',
            },
          },
        },
      },
      _meta: { description: 'ILM policies' },
    },
  },
};

export const TELEMETRY_ILM_STATS_EVENT: EventTypeOpts<IlmsStats> = {
  eventType: 'telemetry_ilm_stats_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index currently managed by the ILM  policy.' },
          },
          phase: {
            type: 'keyword',
            _meta: {
              optional: true,
              description:
                'The current phase of the ILM policy that the index is in (e.g., hot, warm, cold, frozen, or delete).',
            },
          },
          age: {
            type: 'text',
            _meta: {
              optional: true,
              description:
                'The age of the index since its creation, indicating how long it has existed.',
            },
          },
          policy_name: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'The name of the ILM policy applied to this index.',
            },
          },
        },
      },
      _meta: { description: 'ILM stats' },
    },
  },
};

export const TELEMETRY_INDEX_TEMPLATES_EVENT: EventTypeOpts<IndexTemplatesStats> = {
  eventType: 'telemetry_index_templates_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          template_name: {
            type: 'keyword',
            _meta: { description: 'The name of the template.' },
          },
          index_mode: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'The index mode.',
            },
          },
          datastream: {
            type: 'boolean',
            _meta: {
              description: 'Datastream dataset',
            },
          },
          package_name: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'The package name',
            },
          },
          managed_by: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Managed by',
            },
          },
          beat: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Shipper name',
            },
          },
          is_managed: {
            type: 'boolean',
            _meta: {
              optional: true,
              description: 'Whether the template is managed',
            },
          },
          composed_of: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'List of template components',
              },
            },
            _meta: { description: '' },
          },
          source_enabled: {
            type: 'boolean',
            _meta: {
              optional: true,
              description:
                'The _source field contains the original JSON document body that was provided at index time',
            },
          },
          source_includes: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'Fields included in _source, if enabled',
              },
            },
            _meta: { description: '' },
          },
          source_excludes: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: '',
              },
            },
            _meta: { description: 'Fields excludes from _source, if enabled' },
          },
        },
      },
      _meta: { description: 'Index templates info' },
    },
  },
};

export const TELEMETRY_NODE_INGEST_PIPELINES_STATS_EVENT: EventTypeOpts<NodeIngestPipelinesStats> =
  {
    eventType: 'telemetry_node_ingest_pipelines_stats_event',
    schema: {
      name: {
        type: 'keyword',
        _meta: { description: 'The name of the node' },
      },
      pipelines: {
        type: 'array',
        items: {
          properties: {
            name: {
              type: 'keyword',
              _meta: { description: 'The name of the pipeline.' },
            },
            totals: {
              properties: {
                count: {
                  type: 'long',
                  _meta: {
                    description:
                      'Total number of documents ingested during the lifetime of this node.',
                  },
                },
                time_in_millis: {
                  type: 'long',
                  _meta: {
                    description: 'Ingestion elapsed time during the lifetime of this node.',
                  },
                },
                current: {
                  type: 'long',
                  _meta: { description: 'Total number of documents currently being ingested.' },
                },
                failed: {
                  type: 'long',
                  _meta: {
                    description:
                      'Total number of failed ingest operations during the lifetime of this node.',
                  },
                },
              },
            },
            processors: {
              type: 'array',
              items: {
                properties: {
                  name: {
                    type: 'keyword',
                    _meta: { description: 'The name of the pipeline.' },
                  },
                  totals: {
                    properties: {
                      count: {
                        type: 'long',
                        _meta: {
                          description:
                            'Total number of documents ingested during the lifetime of this node.',
                        },
                      },
                      time_in_millis: {
                        type: 'long',
                        _meta: {
                          description: 'Ingestion elapsed time during the lifetime of this node.',
                        },
                      },
                      current: {
                        type: 'long',
                        _meta: {
                          description: 'Total number of documents currently being ingested.',
                        },
                      },
                      failed: {
                        type: 'long',
                        _meta: {
                          description:
                            'Total number of failed ingest operations during the lifetime of this node.',
                        },
                      },
                    },
                  },
                },
                _meta: { description: 'Datastreams' },
              },
            },
          },
          _meta: { description: 'Datastreams' },
        },
      },
      totals: {
        properties: {
          count: {
            type: 'long',
            _meta: {
              description: 'Total number of documents ingested during the lifetime of this node.',
            },
          },
          time_in_millis: {
            type: 'long',
            _meta: { description: 'Ingestion elapsed time during the lifetime of this node.' },
          },
          current: {
            type: 'long',
            _meta: { description: 'Total number of documents currently being ingested.' },
          },
          failed: {
            type: 'long',
            _meta: {
              description:
                'Total number of failed ingest operations during the lifetime of this node.',
            },
          },
        },
      },
    },
  };

interface CreateAssetCriticalityProcessedFileEvent {
  result?: BulkUpsertAssetCriticalityRecordsResponse['stats'];
  startTime: Date;
  endTime: Date;
}

export const createAssetCriticalityProcessedFileEvent = ({
  result,
  startTime,
  endTime,
}: CreateAssetCriticalityProcessedFileEvent): [
  string,
  AssetCriticalitySystemProcessedAssignmentFileEvent
] => {
  const status = getUploadStatus(result);

  const processing = {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    tookMs: endTime.getTime() - startTime.getTime(),
  };

  return [
    ASSET_CRITICALITY_SYSTEM_PROCESSED_ASSIGNMENT_FILE_EVENT.eventType,
    {
      processing,
      result,
      status,
    },
  ];
};

const getUploadStatus = (stats?: BulkUpsertAssetCriticalityRecordsResponse['stats']) => {
  if (!stats) {
    return 'fail';
  }

  if (stats.failed === 0) {
    return 'success';
  }

  if (stats.successful > 0) {
    return 'partial_success';
  }

  return 'fail';
};

export const ENDPOINT_RESPONSE_ACTION_SENT_ERROR_EVENT: EventTypeOpts<{
  responseActions: {
    agentType: ResponseActionAgentType;
    command: ResponseActionsApiCommandNames;
    error: string;
  };
}> = {
  eventType: 'endpoint_response_action_sent_error',
  schema: {
    responseActions: {
      properties: {
        agentType: {
          type: 'keyword',
          _meta: {
            description: 'The type of agent that the action was sent to',
            optional: false,
          },
        },
        command: {
          type: 'keyword',
          _meta: {
            description: 'The command that was sent to the endpoint',
            optional: false,
          },
        },
        error: {
          type: 'text',
          _meta: {
            description: 'The error message for the response action',
          },
        },
      },
    },
  },
};

export const ENDPOINT_RESPONSE_ACTION_SENT_EVENT: EventTypeOpts<{
  responseActions: {
    actionId: string;
    agentType: ResponseActionAgentType;
    command: ResponseActionsApiCommandNames;
    isAutomated: boolean;
  };
}> = {
  eventType: 'endpoint_response_action_sent',
  schema: {
    responseActions: {
      properties: {
        actionId: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the action that was sent to the endpoint',
            optional: false,
          },
        },
        agentType: {
          type: 'keyword',
          _meta: {
            description: 'The type of agent that the action was sent to',
            optional: false,
          },
        },
        command: {
          type: 'keyword',
          _meta: {
            description: 'The command that was sent to the endpoint',
            optional: false,
          },
        },
        isAutomated: {
          type: 'boolean',
          _meta: {
            description: 'Whether the action was auto-initiated by a pre-configured rule',
            optional: false,
          },
        },
      },
    },
  },
};

export const ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT: EventTypeOpts<{
  responseActions: {
    actionId: string;
    agentType: ResponseActionAgentType;
    actionStatus: ResponseActionStatus;
    command: ResponseActionsApiCommandNames;
  };
}> = {
  eventType: 'endpoint_response_action_status_change_event',
  schema: {
    responseActions: {
      properties: {
        actionId: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the action that was sent to the endpoint',
            optional: false,
          },
        },
        agentType: {
          type: 'keyword',
          _meta: {
            description: 'The type of agent that the action was sent to',
            optional: false,
          },
        },
        actionStatus: {
          type: 'keyword',
          _meta: {
            description: 'The status of the action',
            optional: false,
          },
        },
        command: {
          type: 'keyword',
          _meta: {
            description: 'The command that was sent to the endpoint',
            optional: false,
          },
        },
      },
    },
  },
};

export const SIEM_MIGRATIONS_MIGRATION_SUCCESS: EventTypeOpts<{
  model: string;
  migrationId: string;
  duration: number;
  completed: number;
  failed: number;
  total: number;
  eventName: string;
}> = {
  eventType: SiemMigrationsEventTypes.MigrationSuccess,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    completed: {
      type: 'long',
      _meta: {
        description: 'Number of rules successfully migrated',
      },
    },
    failed: {
      type: 'long',
      _meta: {
        description: 'Number of rules that failed to migrate',
      },
    },
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of rules to migrate',
      },
    },
  },
};

export const SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS: EventTypeOpts<{
  model: string;
  migrationId: string;
  duration: number;
  translationResult: string;
  prebuiltMatch: boolean;
  eventName: string;
}> = {
  eventType: SiemMigrationsEventTypes.TranslationSuccess,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    translationResult: {
      type: 'keyword',
      _meta: {
        description: 'Describes if the translation was full or partial',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    prebuiltMatch: {
      type: 'boolean',
      _meta: {
        description: 'Whether a prebuilt rule was matched',
      },
    },
  },
};

export const SIEM_MIGRATIONS_PREBUILT_RULES_MATCH: EventTypeOpts<{
  model: string;
  migrationId: string;
  preFilterRuleNames: string[];
  preFilterRuleCount: number;
  postFilterRuleName: string;
  postFilterRuleCount: number;
  eventName: string;
}> = {
  eventType: SiemMigrationsEventTypes.PrebuiltRulesMatch,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    preFilterRuleNames: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'List of matched rules from Semantic search before LLM filtering',
        },
      },
    },
    preFilterRuleCount: {
      type: 'long',
      _meta: {
        description: 'Count of rules matched before LLM filtering',
      },
    },
    postFilterRuleName: {
      type: 'keyword',
      _meta: {
        description: 'List of matched rules from Semantic search after LLM filtering',
      },
    },
    postFilterRuleCount: {
      type: 'long',
      _meta: {
        description: 'Count of rules matched before LLM filtering',
      },
    },
  },
};

export const SIEM_MIGRATIONS_INTEGRATIONS_MATCH: EventTypeOpts<{
  model: string;
  migrationId: string;
  preFilterIntegrationNames: string[];
  preFilterIntegrationCount: number;
  postFilterIntegrationName: string;
  postFilterIntegrationCount: number;
  eventName: string;
}> = {
  eventType: SiemMigrationsEventTypes.IntegrationsMatch,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    preFilterIntegrationNames: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'List of matched integrations from Semantic search before LLM filtering',
        },
      },
    },
    preFilterIntegrationCount: {
      type: 'long',
      _meta: {
        description: 'Count of integrations matched before LLM filtering',
      },
    },
    postFilterIntegrationName: {
      type: 'keyword',
      _meta: {
        description: 'List of matched integrations from Semantic search after LLM filtering',
      },
    },
    postFilterIntegrationCount: {
      type: 'long',
      _meta: {
        description: 'Count of integrations matched before LLM filtering',
      },
    },
  },
};

export const SIEM_MIGRATIONS_MIGRATION_FAILURE: EventTypeOpts<{
  model: string;
  error: string;
  migrationId: string;
  duration: number;
  completed: number;
  failed: number;
  total: number;
  eventName: string;
}> = {
  eventType: SiemMigrationsEventTypes.MigrationFailure,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for the migration failure',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    completed: {
      type: 'long',
      _meta: {
        description: 'Number of rules successfully migrated',
      },
    },
    failed: {
      type: 'long',
      _meta: {
        description: 'Number of rules that failed to migrate',
      },
    },
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of rules to migrate',
      },
    },
  },
};

export const SIEM_MIGRATIONS_MIGRATION_ABORTED: EventTypeOpts<{
  model: string;
  reason: string;
  migrationId: string;
  duration: number;
  completed: number;
  failed: number;
  total: number;
  eventName: string;
}> = {
  eventType: SiemMigrationsEventTypes.MigrationAborted,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    reason: {
      type: 'keyword',
      _meta: {
        description: 'The reason of the migration abort',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    completed: {
      type: 'long',
      _meta: {
        description: 'Number of rules successfully migrated',
      },
    },
    failed: {
      type: 'long',
      _meta: {
        description: 'Number of rules that failed to migrate',
      },
    },
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of rules to migrate',
      },
    },
  },
};

export const SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE: EventTypeOpts<{
  model: string;
  error: string;
  migrationId: string;
  eventName: string;
}> = {
  eventType: SiemMigrationsEventTypes.TranslationFailure,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for the translation failure',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
  },
};

export const ENDPOINT_WORKFLOW_INSIGHTS_REMEDIATED_EVENT: EventTypeOpts<{
  insightId: string;
}> = {
  eventType: 'endpoint_workflow_insights_remediated_event',
  schema: {
    insightId: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the action that was sent to the endpoint',
        optional: false,
      },
    },
  },
};

export const events = [
  RISK_SCORE_EXECUTION_SUCCESS_EVENT,
  RISK_SCORE_EXECUTION_ERROR_EVENT,
  RISK_SCORE_EXECUTION_CANCELLATION_EVENT,
  ASSET_CRITICALITY_SYSTEM_PROCESSED_ASSIGNMENT_FILE_EVENT,
  ALERT_SUPPRESSION_EVENT,
  ENDPOINT_RESPONSE_ACTION_SENT_EVENT,
  ENDPOINT_RESPONSE_ACTION_SENT_ERROR_EVENT,
  ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT,
  ENDPOINT_WORKFLOW_INSIGHTS_REMEDIATED_EVENT,
  FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT,
  ENTITY_STORE_DATA_VIEW_REFRESH_EXECUTION_EVENT,
  ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
  ENTITY_ENGINE_INITIALIZATION_EVENT,
  ENTITY_STORE_USAGE_EVENT,
  PRIVMON_ENGINE_INITIALIZATION_EVENT,
  PRIVMON_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
  TELEMETRY_DATA_STREAM_EVENT,
  TELEMETRY_ILM_POLICY_EVENT,
  TELEMETRY_ILM_STATS_EVENT,
  TELEMETRY_INDEX_SETTINGS_EVENT,
  TELEMETRY_INDEX_STATS_EVENT,
  TELEMETRY_INDEX_TEMPLATES_EVENT,
  TELEMETRY_NODE_INGEST_PIPELINES_STATS_EVENT,
  SIEM_MIGRATIONS_MIGRATION_SUCCESS,
  SIEM_MIGRATIONS_MIGRATION_ABORTED,
  SIEM_MIGRATIONS_MIGRATION_FAILURE,
  SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS,
  SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE,
  SIEM_MIGRATIONS_PREBUILT_RULES_MATCH,
  SIEM_MIGRATIONS_INTEGRATIONS_MATCH,
];

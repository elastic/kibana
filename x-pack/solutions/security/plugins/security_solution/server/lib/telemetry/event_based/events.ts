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
import type {
  HealthDiagnosticQueryResult,
  HealthDiagnosticQueryStats,
} from '../diagnostic/health_diagnostic_service.types';

import { SIEM_MIGRATIONS_EVENTS } from './events/siem_migrations';
import type {
  RuleBulkUpgradeTelemetry,
  RuleUpgradeTelemetry,
} from '../../detection_engine/prebuilt_rules/api/perform_rule_upgrade/update_rule_telemetry';
import { TRIAL_COMPANION_EVENTS } from '../../trial_companion/telemetry/trial_companion_ebt_events';

// Telemetry event that is sent for each rule that is upgraded during a prebuilt rule upgrade
export const DETECTION_RULE_UPGRADE_EVENT: EventTypeOpts<RuleUpgradeTelemetry> = {
  eventType: 'detection_rule_upgrade',
  schema: {
    ruleId: { type: 'keyword', _meta: { description: 'Rule ID' } },
    ruleName: { type: 'keyword', _meta: { description: 'Rule name' } },
    hasBaseVersion: {
      type: 'boolean',
      _meta: { description: 'True if base version exists for this rule' },
    },
    finalResult: {
      type: 'keyword',
      _meta: { description: 'Overall outcome: SUCCESS | SKIP | ERROR' },
    },
    updatedFieldsSummary: {
      properties: {
        count: { type: 'long', _meta: { description: 'Number of updated fields' } },
        nonSolvableConflictsCount: {
          type: 'long',
          _meta: { description: 'Number of non-solvable conflicts' },
        },
        solvableConflictsCount: {
          type: 'long',
          _meta: { description: 'Number of solvable conflicts' },
        },
        noConflictsCount: {
          type: 'long',
          _meta: { description: 'Number of fields without conflicts' },
        },
      },
    },
    updatedFieldsTotal: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Rule field name',
        },
      },
      _meta: { description: 'Fields that were updated' },
    },
    updatedFieldsWithNonSolvableConflicts: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Rule field name',
        },
      },
      _meta: { description: 'Fields with non-solvable conflicts' },
    },
    updatedFieldsWithSolvableConflicts: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Rule field name',
        },
      },
      _meta: { description: 'Fields with solvable conflicts' },
    },
    updatedFieldsWithNoConflicts: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Rule field name',
        },
      },
      _meta: { description: 'Fields updated without conflicts' },
    },
  },
};

// Telemetry event that is sent for each bulk upgrade rules request
export const DETECTION_RULE_BULK_UPGRADE_EVENT: EventTypeOpts<RuleBulkUpgradeTelemetry> = {
  eventType: 'detection_rule_bulk_upgrade',
  schema: {
    successfulUpdates: {
      properties: {
        totalNumberOfRules: {
          type: 'long',
          _meta: { description: 'Number of successfully updated rules in bulk update request' },
        },
        numOfCustomizedRules: {
          type: 'long',
          _meta: {
            description: 'Number of successfully updated customized rules in bulk update request',
          },
        },
        numOfNonCustomizedRules: {
          type: 'long',
          _meta: {
            description:
              'Number of successfully updated non-customized rules in bulk update request',
          },
        },
        numOfNonSolvableConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of successfully updated rules with non-solvable conflicts in bulk update request',
          },
        },
        numOfSolvableConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of successfully updated rules with solvable conflicts in bulk update request',
          },
        },
        numOfNoConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of successfully updated rules with no conflicts in bulk update request',
          },
        },
      },
    },
    errorUpdates: {
      properties: {
        totalNumberOfRules: {
          type: 'long',
          _meta: { description: 'Number of rules that failed to update in bulk update request' },
        },
        numOfCustomizedRules: {
          type: 'long',
          _meta: {
            description: 'Number of customized rules that failed to update in bulk update request',
          },
        },
        numOfNonCustomizedRules: {
          type: 'long',
          _meta: {
            description:
              'Number of non-customized rules that failed to update in bulk update request',
          },
        },
        numOfNonSolvableConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of rules with non-solvable conflicts that failed to update in bulk update request',
          },
        },
        numOfSolvableConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of rules with solvable conflicts that failed to update in bulk update request',
          },
        },
        numOfNoConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of rules with no conflicts that failed to update in bulk update request',
          },
        },
      },
    },
    skippedUpdates: {
      properties: {
        totalNumberOfRules: {
          type: 'long',
          _meta: { description: 'Number of rules that were skipped during bulk update request' },
        },
        numOfCustomizedRules: {
          type: 'long',
          _meta: {
            description: 'Number of customized rules that were skipped during bulk update request',
          },
        },
        numOfNonCustomizedRules: {
          type: 'long',
          _meta: {
            description:
              'Number of non-customized rules that were skipped during bulk update request',
          },
        },
        numOfNonSolvableConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of rules with non-solvable conflicts that were skipped during bulk update request',
          },
        },
        numOfSolvableConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of rules with solvable conflicts that were skipped during bulk update request',
          },
        },
        numOfNoConflicts: {
          type: 'long',
          _meta: {
            description:
              'Number of rules with no conflicts that were skipped during bulk update request',
          },
        },
      },
    },
  },
};

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

export const ENTITY_STORE_SNAPSHOT_TASK_EXECUTION_EVENT: EventTypeOpts<{
  entityType: string;
  namespace: string;
  snapshotDate: Date;
  snapshotIndex: string;
  entityCount: number;
  durationMs: number;
  success: boolean;
  errorMessage: string | undefined;
}> = {
  eventType: 'entity_store_data_view_refresh_execution',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
    snapshotDate: {
      type: 'date',
      _meta: {
        description:
          'Snapshot date marks the date on which the entities were captured (the day before the task run)',
      },
    },
    snapshotIndex: {
      type: 'keyword',
      _meta: {
        description: 'Name of the index containing captured entities',
      },
    },
    entityCount: {
      type: 'long',
      _meta: {
        description: 'Number of entities captured in the snapshot',
      },
    },
    durationMs: {
      type: 'long',
      _meta: {
        description:
          'Duration (in milliseconds) of the entity store data view refresh execution time',
      },
    },
    success: {
      type: 'boolean',
      _meta: {
        description: 'True if the task run was completed succesfully, false otherwise',
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        optional: true,
        description: 'Contains the error message in case the task run failed (success: false)',
      },
    },
  },
};

export const ENTITY_STORE_HEALTH_REPORT_EVENT: EventTypeOpts<{
  engines: Array<{
    type: string;
    status: string;
    delay: string;
    frequency: string;
    docsPerSecond: number;
    lookbackPeriod: string;
    fieldHistoryLength: number;
    indexPattern: string;
    filter: string;
    timestampField: string;
    components: Array<{
      id: string;
      resource: string;
      installed: boolean;
      health?: string;
    }>;
  }>;
}> = {
  eventType: 'entity_store_health_report',
  schema: {
    engines: {
      type: 'array',
      items: {
        properties: {
          type: {
            type: 'keyword',
            _meta: { description: 'Engine type (e.g "host" or "generic")' },
          },
          status: {
            type: 'keyword',
            _meta: {
              description: 'Overall engine status',
            },
          },
          delay: {
            type: 'keyword',
            _meta: {
              description: 'Initial data processing delay (human readable, e.g., "5s")',
            },
          },
          frequency: {
            type: 'keyword',
            _meta: { description: 'Run frequency (e.g., "1m", "15m")' },
          },
          docsPerSecond: {
            type: 'double',
            _meta: { description: 'Indexing rate in documents per second' },
          },
          lookbackPeriod: {
            type: 'keyword',
            _meta: {
              description: 'Lookback period used by the engine (e.g., "7d")',
            },
          },
          fieldHistoryLength: {
            type: 'long',
            _meta: {
              description: 'Number of historical field entries retained',
            },
          },
          indexPattern: {
            type: 'keyword',
            _meta: { description: 'Additional index pattern ingested by the transform' },
          },
          filter: {
            type: 'keyword',
            _meta: {
              description: 'Optional filter applied to ingested documents',
            },
          },
          timestampField: {
            type: 'keyword',
            _meta: {
              description:
                'Name of the timestamp field used for all operations (e.g. "@timestamp")',
            },
          },
          components: {
            type: 'array',
            items: {
              properties: {
                id: {
                  type: 'keyword',
                  _meta: { description: 'Component identifier' },
                },
                resource: {
                  type: 'keyword',
                  _meta: {
                    description: 'Type of the component (e.g. "index" or "transform")',
                  },
                },
                installed: {
                  type: 'boolean',
                  _meta: { description: 'Whether the component is installed' },
                },
                health: {
                  type: 'keyword',
                  _meta: {
                    optional: true,
                    description: 'Reported component health; Present for transforms',
                  },
                },
              },
            },
          },
        },
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
  entityType: string;
  namespace: string;
}> = {
  eventType: 'entity_engine_initialization',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the entity engine initialization',
      },
    },
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
};

export const ENTITY_ENGINE_DELETION_EVENT: EventTypeOpts<{
  duration: number;
  entityType: string;
  namespace: string;
}> = {
  eventType: 'entity_engine_deletion',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the entity engine deletion',
      },
    },
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
};

export const ENTITY_HIGHLIGHTS_USAGE_EVENT: EventTypeOpts<{
  entityType: string;
  spaceId: string;
}> = {
  eventType: 'entity_highlights_usage',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entity highlights have been request for  (e.g. "host")',
      },
    },
    spaceId: {
      type: 'keyword',
      _meta: {
        description: 'Space where the highlight request originated (e.g. "default")',
      },
    },
  },
};

export const ENTITY_STORE_USAGE_EVENT: EventTypeOpts<{
  storeSize: number;
  entityType: string;
  namespace: string;
}> = {
  eventType: 'entity_store_usage',
  schema: {
    storeSize: {
      type: 'long',
      _meta: {
        description: 'Number of entities stored in the entity store by type and namespace',
      },
    },
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
};

export const ENTITY_STORE_API_CALL_EVENT: EventTypeOpts<{
  endpoint: string;
  error?: string;
}> = {
  eventType: 'entity_store_api_call',
  schema: {
    endpoint: {
      type: 'keyword',
      _meta: {
        description: 'Name of the endpoint called',
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        optional: true,
        description: 'Contains error message in case the call failed',
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

export const TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT: EventTypeOpts<HealthDiagnosticQueryResult> =
  {
    eventType: 'telemetry_health_diagnostic_query_result_event',
    schema: {
      name: {
        type: 'keyword',
        _meta: { description: 'Identifier for the executed query.' },
      },
      queryId: {
        type: 'keyword',
        _meta: { description: 'Unique identifier for the specific query.' },
      },
      traceId: {
        type: 'keyword',
        _meta: { description: 'Unique trace ID for correlating a single query execution.' },
      },
      page: {
        type: 'integer',
        _meta: { description: 'Page number of the query result.' },
      },
      data: {
        type: 'pass_through',
        _meta: { description: 'Raw query result payload.' },
      },
    },
  };
export const TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT: EventTypeOpts<HealthDiagnosticQueryStats> =
  {
    eventType: 'telemetry_health_diagnostic_query_stats_event',
    schema: {
      name: {
        type: 'keyword',
        _meta: { description: 'Identifier for the executed query.' },
      },
      traceId: {
        type: 'keyword',
        _meta: { description: 'Unique trace ID for correlating a single query execution.' },
      },
      numDocs: {
        type: 'integer',
        _meta: { description: 'Number of documents returned by the query.' },
      },
      passed: {
        type: 'boolean',
        _meta: { description: 'Indicates whether the query completed successfully.' },
      },
      started: {
        type: 'keyword',
        _meta: { description: 'When the query started execution.' },
      },
      finished: {
        type: 'keyword',
        _meta: { description: 'When the query finished execution.' },
      },
      failure: {
        properties: {
          message: {
            type: 'keyword',
            _meta: { description: 'A high-level failure message describing the error.' },
          },
          reason: {
            properties: {
              circuitBreaker: {
                type: 'keyword',
                _meta: {
                  description: 'The name of the circuit breaker that triggered the failure.',
                },
              },
              valid: {
                type: 'boolean',
                _meta: {
                  description: 'Indicates whether the query execution was considered valid.',
                },
              },
              message: {
                type: 'keyword',
                _meta: {
                  optional: true,
                  description:
                    'A detailed reason or message explaining why the circuit breaker was triggered.',
                },
              },
            },
          },
        },
        _meta: {
          optional: true,
          description: 'Details about the failure if the operation was unsuccessful.',
        },
      },
      fieldNames: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'Field names in the query result.',
          },
        },
      },
      circuitBreakers: {
        type: 'pass_through',
        _meta: {
          optional: true,
          description: 'Circuit breaker metrics such as execution time and memory usage.',
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

export const GAP_DETECTED_EVENT: EventTypeOpts<{
  gapDuration: number;
  intervalDuration: number;
  intervalAndLookbackDuration: number;
  ruleType: string;
  ruleSource: string;
  isCustomized: boolean;
}> = {
  eventType: 'gap_detected_event',
  schema: {
    gapDuration: {
      type: 'long',
      _meta: {
        description: 'The duration of the gap',
      },
    },
    intervalDuration: {
      type: 'long',
      _meta: {
        description: 'The duration of the interval',
      },
    },
    intervalAndLookbackDuration: {
      type: 'long',
      _meta: {
        description: 'The duration of the interval and lookback',
      },
    },
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'The type of the rule',
      },
    },
    ruleSource: {
      type: 'keyword',
      _meta: {
        description: 'The source of the rule',
      },
    },
    isCustomized: {
      type: 'boolean',
      _meta: {
        description: 'Whether the prebuilt rule is customized',
      },
    },
  },
};

export const events = [
  DETECTION_RULE_UPGRADE_EVENT,
  DETECTION_RULE_BULK_UPGRADE_EVENT,
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
  ENTITY_STORE_SNAPSHOT_TASK_EXECUTION_EVENT,
  ENTITY_STORE_HEALTH_REPORT_EVENT,
  ENTITY_STORE_API_CALL_EVENT,
  ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
  ENTITY_ENGINE_INITIALIZATION_EVENT,
  ENTITY_ENGINE_DELETION_EVENT,
  ENTITY_STORE_USAGE_EVENT,
  ENTITY_HIGHLIGHTS_USAGE_EVENT,
  PRIVMON_ENGINE_INITIALIZATION_EVENT,
  PRIVMON_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
  TELEMETRY_DATA_STREAM_EVENT,
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_RESULT_EVENT,
  TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT,
  TELEMETRY_ILM_POLICY_EVENT,
  TELEMETRY_ILM_STATS_EVENT,
  TELEMETRY_INDEX_SETTINGS_EVENT,
  TELEMETRY_INDEX_STATS_EVENT,
  TELEMETRY_INDEX_TEMPLATES_EVENT,
  TELEMETRY_NODE_INGEST_PIPELINES_STATS_EVENT,
  ...SIEM_MIGRATIONS_EVENTS,
  GAP_DETECTED_EVENT,
  ...TRIAL_COMPANION_EVENTS,
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ENDPOINT_ASSET_FACTS_TRANSFORM_PREFIX,
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_DELAY,
  ENTITY_TYPE,
  ENTITY_SUB_TYPE,
  ENTITY_SOURCE,
} from '../../../../common/endpoint_assets';

/**
 * Transform configuration for aggregating osquery results into per-asset documents.
 *
 * This transform:
 * - Reads from logs-osquery_manager.* (osquery results)
 * - Groups by host.id to create one document per asset
 * - Uses top_metrics to get the latest values for each field
 * - Aggregates security-relevant counts for CAASM visibility
 * - Outputs to endpoint-assets-osquery-{namespace}
 *
 * Schema is designed to be compatible with Entity Store for future integration.
 */
export const getAssetFactsTransformId = (namespace: string): string =>
  `${ENDPOINT_ASSET_FACTS_TRANSFORM_PREFIX}${namespace}`;

export const getAssetFactsTransformConfig = (
  namespace: string
): TransformPutTransformRequest => ({
  transform_id: getAssetFactsTransformId(namespace),
  description:
    'Aggregates osquery results into endpoint asset documents for CAASM visibility. Schema compatible with Entity Store.',
  source: {
    // Read from all osquery result indices for this namespace
    index: [`logs-osquery_manager.result-${namespace}`],
    query: {
      bool: {
        // Filter for documents that have host.id (required for grouping)
        filter: [
          {
            exists: {
              field: 'host.id',
            },
          },
        ],
      },
    },
  },
  dest: {
    index: `endpoint-assets-osquery-${namespace}`,
  },
  pivot: {
    group_by: {
      // =================================================================
      // ENTITY STORE COMPATIBLE FIELDS (group_by creates identity)
      // =================================================================
      'entity.id': {
        terms: {
          field: 'host.id',
        },
      },
      'entity.name': {
        terms: {
          field: 'host.name',
        },
      },
    },
    aggregations: {
      // =================================================================
      // ENTITY STORE COMPATIBLE FIELDS
      // =================================================================

      // Static entity type fields (set via scripted_metric or runtime)
      // Entity type is set statically - host.type may not exist in osquery data
      // We'll set this in the ingest pipeline instead

      // =================================================================
      // ASSET INVENTORY COMPATIBLE FIELDS
      // =================================================================

      'asset.platform': {
        top_metrics: {
          metrics: [{ field: 'host.os.platform' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // =================================================================
      // ECS HOST FIELDS (for correlation)
      // =================================================================

      'host.id': {
        top_metrics: {
          metrics: [{ field: 'host.id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.name': {
        top_metrics: {
          metrics: [{ field: 'host.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.hostname': {
        top_metrics: {
          metrics: [{ field: 'host.hostname' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.os.name': {
        top_metrics: {
          metrics: [{ field: 'host.os.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.os.version': {
        top_metrics: {
          metrics: [{ field: 'host.os.version' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.os.platform': {
        top_metrics: {
          metrics: [{ field: 'host.os.platform' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.os.family': {
        top_metrics: {
          metrics: [{ field: 'host.os.family' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.architecture': {
        top_metrics: {
          metrics: [{ field: 'host.architecture' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // =================================================================
      // NETWORK FIELDS (CAASM - Asset Identification)
      // =================================================================

      'host.os.build': {
        top_metrics: {
          metrics: [{ field: 'host.os.build' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.os.kernel': {
        top_metrics: {
          metrics: [{ field: 'host.os.kernel' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      // Note: host.ip and host.mac are arrays, top_metrics will get one value
      // For full array, would need scripted_metric aggregation
      'host.ip': {
        top_metrics: {
          metrics: [{ field: 'host.ip' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.mac': {
        top_metrics: {
          metrics: [{ field: 'host.mac' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // =================================================================
      // ECS AGENT FIELDS
      // =================================================================

      'agent.id': {
        top_metrics: {
          metrics: [{ field: 'agent.id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'agent.name': {
        top_metrics: {
          metrics: [{ field: 'agent.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'agent.type': {
        top_metrics: {
          metrics: [{ field: 'agent.type' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'agent.version': {
        top_metrics: {
          metrics: [{ field: 'agent.version' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // =================================================================
      // ENDPOINT LIFECYCLE FIELDS
      // =================================================================

      'endpoint.lifecycle.first_seen': {
        min: {
          field: '@timestamp',
        },
      },
      'endpoint.lifecycle.last_seen': {
        max: {
          field: '@timestamp',
        },
      },

      // Document timestamp
      '@timestamp': {
        max: {
          field: '@timestamp',
        },
      },

      // =================================================================
      // ENDPOINT SERVICES (filter: has osquery.status)
      // =================================================================
      'endpoint.services': {
        filter: { exists: { field: 'osquery.status' } },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_path: {
            top_metrics: {
              metrics: [{ field: 'osquery.path' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_start_type: {
            top_metrics: {
              metrics: [{ field: 'osquery.start_type' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_status: {
            top_metrics: {
              metrics: [{ field: 'osquery.status' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.status' } },
        },
      },

      // =================================================================
      // ENDPOINT SCHEDULED TASKS (filter: has enabled+action, NOT direction)
      // =================================================================
      'endpoint.scheduled_tasks': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.enabled' } },
              { exists: { field: 'osquery.action' } },
            ],
            must_not: [{ exists: { field: 'osquery.direction' } }],
          },
        },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_action: {
            top_metrics: {
              metrics: [{ field: 'osquery.action' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_enabled: {
            top_metrics: {
              metrics: [{ field: 'osquery.enabled' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.enabled' } },
        },
      },

      // =================================================================
      // ENDPOINT FIREWALL RULES (filter: has osquery.direction)
      // =================================================================
      'endpoint.firewall_rules': {
        filter: { exists: { field: 'osquery.direction' } },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_action: {
            top_metrics: {
              metrics: [{ field: 'osquery.action' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_direction: {
            top_metrics: {
              metrics: [{ field: 'osquery.direction' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_enabled: {
            top_metrics: {
              metrics: [{ field: 'osquery.enabled' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.direction' } },
        },
      },

      // =================================================================
      // ENDPOINT PRIVILEGES (filter: has osquery.groupname for admin groups)
      // =================================================================
      'endpoint.privileges.local_admins': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.user' } },
              { exists: { field: 'osquery.groupname' } },
            ],
            should: [
              { term: { 'osquery.groupname': 'Administrators' } },
              { term: { 'osquery.groupname': 'admin' } },
              { term: { 'osquery.groupname': 'sudo' } },
              { term: { 'osquery.groupname': 'wheel' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          admins_list: {
            terms: {
              field: 'osquery.user',
              size: 100,
            },
          },
        },
      },

      'endpoint.privileges.admin_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.user' } },
              { exists: { field: 'osquery.groupname' } },
            ],
            should: [
              { term: { 'osquery.groupname': 'Administrators' } },
              { term: { 'osquery.groupname': 'admin' } },
              { term: { 'osquery.groupname': 'sudo' } },
              { term: { 'osquery.groupname': 'wheel' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.user',
            },
          },
        },
      },

      'endpoint.privileges.root_users': {
        filter: {
          bool: {
            must: [{ exists: { field: 'osquery.uid' } }],
            should: [{ term: { 'osquery.uid': '0' } }, { term: { 'osquery.uid': 0 } }],
            minimum_should_match: 1,
          },
        },
        aggs: {
          root_list: {
            terms: {
              field: 'osquery.username',
              size: 50,
            },
          },
        },
      },

      // =================================================================
      // ENDPOINT SOFTWARE (filter: has osquery.version)
      // =================================================================
      'endpoint.software.installed_count': {
        filter: { exists: { field: 'osquery.version' } },
        aggs: {
          count: { cardinality: { field: 'osquery.name' } },
        },
      },

      'endpoint.software.services_count': {
        filter: { exists: { field: 'osquery.status' } },
        aggs: {
          count: { cardinality: { field: 'osquery.name' } },
        },
      },

      // =================================================================
      // ENDPOINT HARDWARE (filter: has osquery.cpu_brand)
      // =================================================================
      'endpoint.hardware.cpu': {
        filter: { exists: { field: 'osquery.cpu_brand' } },
        aggs: {
          value: {
            top_metrics: {
              metrics: [{ field: 'osquery.cpu_brand' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      'endpoint.hardware.cpu_cores': {
        filter: { exists: { field: 'osquery.cpu_logical_cores' } },
        aggs: {
          value: {
            top_metrics: {
              metrics: [{ field: 'osquery.cpu_logical_cores' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      'endpoint.hardware.memory_gb': {
        filter: { exists: { field: 'osquery.physical_memory' } },
        aggs: {
          value: {
            top_metrics: {
              metrics: [{ field: 'osquery.physical_memory' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      'endpoint.hardware.vendor': {
        filter: { exists: { field: 'osquery.hardware_vendor' } },
        aggs: {
          value: {
            top_metrics: {
              metrics: [{ field: 'osquery.hardware_vendor' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      'endpoint.hardware.model': {
        filter: { exists: { field: 'osquery.hardware_model' } },
        aggs: {
          value: {
            top_metrics: {
              metrics: [{ field: 'osquery.hardware_model' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // =================================================================
      // ENDPOINT MEMORY (filter: has osquery.memory_total)
      // =================================================================
      'endpoint.memory': {
        filter: { exists: { field: 'osquery.memory_total' } },
        aggs: {
          total: {
            top_metrics: {
              metrics: [{ field: 'osquery.memory_total' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          free: {
            top_metrics: {
              metrics: [{ field: 'osquery.memory_free' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          available: {
            top_metrics: {
              metrics: [{ field: 'osquery.memory_available' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // =================================================================
      // ENDPOINT POSTURE CHECKS
      // =================================================================
      'endpoint.posture.disk_encryption_raw': {
        filter: { exists: { field: 'osquery.encrypted' } },
        aggs: {
          value: {
            top_metrics: {
              metrics: [{ field: 'osquery.encrypted' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      'endpoint.posture.firewall_enabled_raw': {
        filter: {
          bool: {
            should: [
              { exists: { field: 'osquery.firewall_enabled' } },
              { exists: { field: 'osquery.global_state' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          value: {
            top_metrics: {
              metrics: [
                { field: 'osquery.firewall_enabled' },
                { field: 'osquery.global_state' },
              ],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      'endpoint.posture.secure_boot_raw': {
        filter: { exists: { field: 'osquery.secure_boot' } },
        aggs: {
          value: {
            top_metrics: {
              metrics: [{ field: 'osquery.secure_boot' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // =================================================================
      // ENDPOINT SHELL ANOMALIES (filter: has osquery.no_history_suspicious)
      // =================================================================
      'endpoint.shell': {
        filter: { exists: { field: 'osquery.no_history_suspicious' } },
        aggs: {
          suspicious: {
            top_metrics: {
              metrics: [{ field: 'osquery.no_history_suspicious' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },


      // =================================================================
      // SECURITY: SUSPICIOUS SCHEDULED TASKS (filter: has detection_method)
      // From: scheduled_tasks_suspicious_windows_elastic - LOTL detection
      // =================================================================
      'endpoint.security.suspicious_tasks': {
        filter: {
          bool: {
            must: [{ exists: { field: 'osquery.detection_method' } }],
            should: [
              { exists: { field: 'osquery.action' } },
              { exists: { field: 'osquery.command_line' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_detection_method: {
            top_metrics: {
              metrics: [{ field: 'osquery.detection_method' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_detection_reason: {
            top_metrics: {
              metrics: [{ field: 'osquery.detection_reason' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_command_line: {
            top_metrics: {
              metrics: [{ field: 'osquery.command_line' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_sha256: {
            top_metrics: {
              metrics: [{ field: 'osquery.sha256' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_vt_link: {
            top_metrics: {
              metrics: [{ field: 'osquery.vt_link' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.detection_method' } },
        },
      },

      // =================================================================
      // SECURITY: SUSPICIOUS SERVICES (filter: has signature_status)
      // From: services_suspicious_windows_elastic - signature validation
      // =================================================================
      'endpoint.security.suspicious_services': {
        filter: { exists: { field: 'osquery.signature_status' } },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_path: {
            top_metrics: {
              metrics: [{ field: 'osquery.path' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_signature_status: {
            top_metrics: {
              metrics: [{ field: 'osquery.signature_status' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_signature_signer: {
            top_metrics: {
              metrics: [{ field: 'osquery.signature_signer' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_sha256: {
            top_metrics: {
              metrics: [{ field: 'osquery.sha256' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_vt_link: {
            top_metrics: {
              metrics: [{ field: 'osquery.vt_link' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.signature_status' } },
        },
      },

      // =================================================================
      // SECURITY: STARTUP ITEMS (filter: has startup-specific detection)
      // From: startup_items_windows_elastic, startup_items_linux_elastic
      // =================================================================
      'endpoint.security.startup_items': {
        filter: {
          bool: {
            should: [
              { exists: { field: 'osquery.source' } }, // startup_items has source field
              {
                bool: {
                  must: [
                    { exists: { field: 'osquery.detection_method' } },
                    { exists: { field: 'osquery.path' } },
                  ],
                  must_not: [
                    { exists: { field: 'osquery.action' } }, // Exclude scheduled tasks
                  ],
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_path: {
            top_metrics: {
              metrics: [{ field: 'osquery.path' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_source: {
            top_metrics: {
              metrics: [{ field: 'osquery.source' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_detection_method: {
            top_metrics: {
              metrics: [{ field: 'osquery.detection_method' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_detection_reason: {
            top_metrics: {
              metrics: [{ field: 'osquery.detection_reason' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.name' } },
        },
      },

      // =================================================================
      // SECURITY: UNSIGNED/UNTRUSTED PROCESSES (filter: has result field)
      // From: unsigned_processes_vt_windows_elastic - VT validation
      // =================================================================
      'endpoint.security.unsigned_processes': {
        filter: {
          bool: {
            must: [{ exists: { field: 'osquery.result' } }],
            should: [
              { term: { 'osquery.result': 'untrusted' } },
              { term: { 'osquery.result': 'missing signature' } },
            ],
            minimum_should_match: 0, // Get all results, filter shows untrusted
          },
        },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_path: {
            top_metrics: {
              metrics: [{ field: 'osquery.path' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_result: {
            top_metrics: {
              metrics: [{ field: 'osquery.result' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_vt_link: {
            top_metrics: {
              metrics: [{ field: 'osquery.VtLink' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.result' } },
        },
      },

      // =================================================================
      // SECURITY: CRONTAB ANALYSIS (filter: has crontab-specific fields)
      // From: crontab_linux_elastic - suspicious cron jobs
      // =================================================================
      'endpoint.security.crontab': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.command' } },
              { exists: { field: 'osquery.path' } },
            ],
            should: [
              { exists: { field: 'osquery.minute' } },
              { exists: { field: 'osquery.hour' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          latest_command: {
            top_metrics: {
              metrics: [{ field: 'osquery.command' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_path: {
            top_metrics: {
              metrics: [{ field: 'osquery.path' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_detection_method: {
            top_metrics: {
              metrics: [{ field: 'osquery.detection_method' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_detection_reason: {
            top_metrics: {
              metrics: [{ field: 'osquery.detection_reason' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.command' } },
        },
      },

      // =================================================================
      // SECURITY: PERSISTED APPS (filter: has persistence indicators)
      // From: persisted_apps_elastic - persistence mechanisms
      // =================================================================
      'endpoint.security.persisted_apps': {
        filter: {
          bool: {
            must: [{ exists: { field: 'osquery.identifier' } }],
            should: [
              { exists: { field: 'osquery.bundle_executable' } },
              { exists: { field: 'osquery.bundle_name' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          latest_name: {
            top_metrics: {
              metrics: [{ field: 'osquery.bundle_name' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_identifier: {
            top_metrics: {
              metrics: [{ field: 'osquery.identifier' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_executable: {
            top_metrics: {
              metrics: [{ field: 'osquery.bundle_executable' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          latest_path: {
            top_metrics: {
              metrics: [{ field: 'osquery.path' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
          doc_count: { value_count: { field: 'osquery.identifier' } },
        },
      },


      // =================================================================
      // QUERY METADATA
      // =================================================================
      'endpoint.queries.total_results': {
        value_count: {
          field: '@timestamp',
        },
      },
    },
  },
  frequency: DEFAULT_TRANSFORM_FREQUENCY,
  sync: {
    time: {
      field: '@timestamp',
      delay: DEFAULT_TRANSFORM_DELAY,
    },
  },
  settings: {
    max_page_search_size: 1000,
    docs_per_second: null, // No throttling
  },
  _meta: {
    version: '7.0.0',
    managed: true,
    managed_by: 'endpoint_assets',
    schema_version: 'caasm_v7_state_centric',
    entity_sub_type: ENTITY_SUB_TYPE.ENDPOINT,
    entity_source: ENTITY_SOURCE.OSQUERY,
    created_at: new Date().toISOString(),
    changelog: 'Restructured from activity-centric to state-centric model. Removed forensic aggregations (prefetch, shimcache, BITS, LNK, USN journal, browser). Added full local_admins array, enhanced hardware facts, proper posture checks.',
  },
});

/**
 * Index mapping for endpoint-assets-osquery-* index
 *
 * Schema is designed to be compatible with Entity Store for future integration.
 */
export const getAssetIndexMapping = () => ({
  mappings: {
    dynamic: 'false', // Allow unmapped fields from transform
    properties: {
      // =================================================================
      // ENTITY STORE COMPATIBLE FIELDS
      // =================================================================
      entity: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'keyword' },
          type: { type: 'keyword' },
          sub_type: { type: 'keyword' },
          source: { type: 'keyword' },
          risk: {
            properties: {
              calculated_level: { type: 'keyword' },
              calculated_score: { type: 'float' },
            },
          },
        },
      },

      // =================================================================
      // ASSET INVENTORY COMPATIBLE FIELDS
      // =================================================================
      asset: {
        properties: {
          criticality: { type: 'keyword' },
          platform: { type: 'keyword' },
          category: { type: 'keyword' },
        },
      },

      // =================================================================
      // ECS HOST FIELDS
      // =================================================================
      host: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'keyword' },
          hostname: { type: 'keyword' },
          os: {
            properties: {
              name: { type: 'keyword' },
              version: { type: 'keyword' },
              platform: { type: 'keyword' },
              family: { type: 'keyword' },
              build: { type: 'keyword' },
              kernel: { type: 'keyword' },
            },
          },
          architecture: { type: 'keyword' },
          ip: { type: 'ip' },
          mac: { type: 'keyword' },
        },
      },

      // =================================================================
      // ECS AGENT FIELDS
      // =================================================================
      agent: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'keyword' },
          type: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },

      // =================================================================
      // ENDPOINT-SPECIFIC DOMAIN FIELDS
      // =================================================================
      endpoint: {
        properties: {
          lifecycle: {
            properties: {
              first_seen: { type: 'date' },
              last_seen: { type: 'date' },
              last_updated: { type: 'date' },
            },
          },
          hardware: {
            properties: {
              cpu: { type: 'keyword' },
              cpu_cores: { type: 'integer' },
              memory_gb: { type: 'float' },
              vendor: { type: 'keyword' },
              model: { type: 'keyword' },
            },
          },
          memory: {
            properties: {
              total: { type: 'keyword' },
              free: { type: 'keyword' },
              available: { type: 'keyword' },
              swap_total: { type: 'keyword' },
              swap_free: { type: 'keyword' },
            },
          },
          network: {
            properties: {
              interfaces: { type: 'nested' },
              listening_ports_count: { type: 'integer' },
            },
          },
          software: {
            properties: {
              installed_count: { type: 'integer' },
              services_count: { type: 'integer' },
            },
          },
          posture: {
            properties: {
              score: { type: 'integer' },
              level: { type: 'keyword' },
              disk_encryption: { type: 'keyword' },
              disk_encryption_raw: { type: 'keyword' },
              disk_name: { type: 'keyword' },
              firewall_enabled: { type: 'boolean' },
              firewall_enabled_raw: { type: 'keyword' },
              secure_boot: { type: 'boolean' },
              secure_boot_raw: { type: 'keyword' },
              checks: {
                properties: {
                  passed: { type: 'integer' },
                  failed: { type: 'integer' },
                  total: { type: 'integer' },
                },
              },
              failed_checks: { type: 'keyword' },
            },
          },
          privileges: {
            properties: {
              local_admins: { type: 'keyword' },
              admin_count: { type: 'integer' },
              root_users: { type: 'keyword' },
              elevated_risk: { type: 'boolean' },
            },
          },
          drift: {
            properties: {
              last_change: { type: 'date' },
              change_types: { type: 'keyword' },
              recently_changed: { type: 'boolean' },
            },
          },
          // =================================================================
          // CAASM PERSISTENCE DETECTION
          // =================================================================
          persistence: {
            properties: {
              total_count: { type: 'integer' },
              latest_name: { type: 'keyword' },
              latest_path: { type: 'keyword' },
              latest_type: { type: 'keyword' },
              latest_status: { type: 'keyword' },
            },
          },
          // =================================================================
          // CAASM CRON SECURITY
          // =================================================================
          cron: {
            properties: {
              detection_method: { type: 'keyword' },
              detection_reason: { type: 'text' },
              latest_command: { type: 'text' },
              crontab_path: { type: 'keyword' },
              cron_type: { type: 'keyword' },
            },
          },
          // =================================================================
          // CAASM SHELL ANOMALIES
          // =================================================================
          shell: {
            properties: {
              no_history_suspicious: { type: 'keyword' },
              shell_type: { type: 'keyword' },
              history_file: { type: 'keyword' },
            },
          },
          // =================================================================
          // SECURITY MONITORING - Detection & Threat Intel
          // =================================================================
          security: {
            properties: {
              // Suspicious scheduled tasks (LOTL detection)
              suspicious_tasks: {
                properties: {
                  latest_name: { type: 'keyword' },
                  latest_detection_method: { type: 'keyword' },
                  latest_detection_reason: { type: 'text' },
                  latest_command_line: { type: 'text' },
                  latest_sha256: { type: 'keyword' },
                  latest_vt_link: { type: 'keyword' },
                  doc_count: { type: 'integer' },
                },
              },
              // Suspicious services (signature validation)
              suspicious_services: {
                properties: {
                  latest_name: { type: 'keyword' },
                  latest_path: { type: 'text' },
                  latest_signature_status: { type: 'keyword' },
                  latest_signature_signer: { type: 'keyword' },
                  latest_sha256: { type: 'keyword' },
                  latest_vt_link: { type: 'keyword' },
                  doc_count: { type: 'integer' },
                },
              },
              // Startup items (persistence)
              startup_items: {
                properties: {
                  latest_name: { type: 'keyword' },
                  latest_path: { type: 'text' },
                  latest_source: { type: 'keyword' },
                  latest_detection_method: { type: 'keyword' },
                  latest_detection_reason: { type: 'text' },
                  doc_count: { type: 'integer' },
                },
              },
              // Unsigned/untrusted processes
              unsigned_processes: {
                properties: {
                  latest_name: { type: 'keyword' },
                  latest_path: { type: 'text' },
                  latest_result: { type: 'keyword' },
                  latest_vt_link: { type: 'keyword' },
                  doc_count: { type: 'integer' },
                },
              },
              // Crontab analysis (Linux)
              crontab: {
                properties: {
                  latest_command: { type: 'text' },
                  latest_path: { type: 'keyword' },
                  latest_detection_method: { type: 'keyword' },
                  latest_detection_reason: { type: 'text' },
                  doc_count: { type: 'integer' },
                },
              },
              // Persisted apps (macOS)
              persisted_apps: {
                properties: {
                  latest_name: { type: 'keyword' },
                  latest_identifier: { type: 'keyword' },
                  latest_executable: { type: 'keyword' },
                  latest_path: { type: 'text' },
                  doc_count: { type: 'integer' },
                },
              },
            },
          },
          // =================================================================
          // CAASM FILE EVENTS
          // =================================================================
          file_events: {
            properties: {
              latest_action: { type: 'keyword' },
              latest_path: { type: 'keyword' },
              latest_category: { type: 'keyword' },
              event_type: { type: 'keyword' },
            },
          },
          // =================================================================
          // QUERY METADATA
          // =================================================================
          queries: {
            properties: {
              last_query_id: { type: 'keyword' },
              total_results: { type: 'integer' },
            },
          },
        },
      },

      // =================================================================
      // EVENT METADATA (Entity Store compatibility)
      // =================================================================
      event: {
        properties: {
          ingested: { type: 'date' },
          kind: { type: 'keyword' },
        },
      },

      '@timestamp': { type: 'date' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
  },
});

/**
 * Ingest pipeline for post-processing transform output.
 *
 * This pipeline:
 * - Sets static entity fields (entity.sub_type, entity.source, asset.category)
 * - Converts raw posture values to boolean/enum
 * - Calculates posture score
 * - Sets event metadata
 */
export const getAssetIngestPipeline = () => ({
  description: 'Post-process endpoint asset documents for Entity Store compatibility',
  processors: [
    // Set static entity fields
    {
      set: {
        field: 'entity.sub_type',
        value: ENTITY_SUB_TYPE.ENDPOINT,
      },
    },
    {
      set: {
        field: 'entity.source',
        value: ENTITY_SOURCE.OSQUERY,
      },
    },
    {
      set: {
        field: 'asset.category',
        value: 'endpoint',
      },
    },
    // Set event metadata
    {
      set: {
        field: 'event.kind',
        value: 'state',
      },
    },
    {
      set: {
        field: 'event.ingested',
        value: '{{_ingest.timestamp}}',
      },
    },
    // Convert disk_encryption_raw to status
    {
      script: {
        source: `
          def raw = ctx.endpoint?.posture?.disk_encryption_raw;
          if (raw == null) {
            ctx.endpoint.posture.disk_encryption = 'UNKNOWN';
          } else if (raw == '1' || raw == 'true' || raw == 'yes') {
            ctx.endpoint.posture.disk_encryption = 'OK';
          } else {
            ctx.endpoint.posture.disk_encryption = 'FAIL';
          }
        `,
      },
    },
    // Convert firewall_enabled_raw to boolean
    {
      script: {
        source: `
          def raw = ctx.endpoint?.posture?.firewall_enabled_raw;
          ctx.endpoint.posture.firewall_enabled = (raw == '1' || raw == 'true' || raw == 'yes');
        `,
      },
    },
    // Convert secure_boot_raw to boolean
    {
      script: {
        source: `
          def raw = ctx.endpoint?.posture?.secure_boot_raw;
          ctx.endpoint.posture.secure_boot = (raw == '1' || raw == 'true' || raw == 'yes');
        `,
      },
    },
    // Calculate posture score and level
    {
      script: {
        lang: 'painless',
        source: `
          int score = 100;
          def failedChecks = new ArrayList();

          // Disk encryption check (-25)
          def diskEnc = ctx.endpoint?.posture?.disk_encryption;
          if (diskEnc == 'FAIL' || diskEnc == '0' || diskEnc == 'false') {
            score -= 25;
            failedChecks.add('disk_encryption');
          }

          // Firewall check (-20)
          def firewall = ctx.endpoint?.posture?.firewall_enabled;
          if (firewall == false || firewall == '0' || firewall == 'false') {
            score -= 20;
            failedChecks.add('firewall_disabled');
          }

          // Secure boot check (-15)
          def secureBoot = ctx.endpoint?.posture?.secure_boot;
          if (secureBoot == false || secureBoot == '0' || secureBoot == 'false') {
            score -= 15;
            failedChecks.add('secure_boot_disabled');
          }

          // Admin count check (-10)
          def adminCount = ctx.endpoint?.privileges?.admin_count?.count?.value;
          if (adminCount != null && adminCount > 2) {
            score -= 10;
            failedChecks.add('excessive_admins');
          }

          // Set score and failed checks
          if (ctx.endpoint.posture == null) {
            ctx.endpoint.posture = new HashMap();
          }
          ctx.endpoint.posture.score = Math.max(0, score);
          ctx.endpoint.posture.failed_checks = failedChecks;

          // Set posture level based on score
          if (score <= 49) {
            ctx.endpoint.posture.level = 'CRITICAL';
          } else if (score <= 69) {
            ctx.endpoint.posture.level = 'HIGH';
          } else if (score <= 89) {
            ctx.endpoint.posture.level = 'MEDIUM';
          } else {
            ctx.endpoint.posture.level = 'LOW';
          }

          // Set posture checks summary
          def totalChecks = 4;
          def passedChecks = totalChecks - failedChecks.size();
          ctx.endpoint.posture.checks = new HashMap();
          ctx.endpoint.posture.checks.passed = passedChecks;
          ctx.endpoint.posture.checks.failed = failedChecks.size();
          ctx.endpoint.posture.checks.total = totalChecks;
        `,
      },
    },
  ],
});

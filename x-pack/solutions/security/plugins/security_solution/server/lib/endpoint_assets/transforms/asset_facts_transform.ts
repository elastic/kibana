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

export const getAssetFactsTransformConfig = (namespace: string): TransformPutTransformRequest => ({
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
    pipeline: `endpoint-assets-ingest-${namespace}`,
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

      tmp_asset_platform: {
        top_metrics: {
          metrics: [{ field: 'host.os.platform' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // =================================================================
      // ECS HOST FIELDS (for correlation)
      // =================================================================

      tmp_host_id: {
        top_metrics: {
          metrics: [{ field: 'host.id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_name: {
        top_metrics: {
          metrics: [{ field: 'host.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_hostname: {
        top_metrics: {
          metrics: [{ field: 'host.hostname' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_name: {
        top_metrics: {
          metrics: [{ field: 'host.os.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_version: {
        top_metrics: {
          metrics: [{ field: 'host.os.version' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_platform: {
        top_metrics: {
          metrics: [{ field: 'host.os.platform' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_family: {
        top_metrics: {
          metrics: [{ field: 'host.os.family' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_architecture: {
        top_metrics: {
          metrics: [{ field: 'host.architecture' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // =================================================================
      // NETWORK FIELDS (CAASM - Asset Identification)
      // =================================================================

      tmp_host_os_build: {
        top_metrics: {
          metrics: [{ field: 'host.os.build' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_kernel: {
        top_metrics: {
          metrics: [{ field: 'host.os.kernel' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      // Note: host.ip and host.mac are arrays, top_metrics will get one value
      // For full array, would need scripted_metric aggregation
      tmp_host_ip: {
        top_metrics: {
          metrics: [{ field: 'host.ip' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_mac: {
        top_metrics: {
          metrics: [{ field: 'host.mac' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // =================================================================
      // ECS AGENT FIELDS
      // =================================================================

      tmp_agent_id: {
        top_metrics: {
          metrics: [{ field: 'agent.id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_agent_name: {
        top_metrics: {
          metrics: [{ field: 'agent.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_agent_type: {
        top_metrics: {
          metrics: [{ field: 'agent.type' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_agent_version: {
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

      // Privileges - SSH authorized keys count
      'endpoint.privileges.ssh_keys_count': {
        filter: { exists: { field: 'osquery.key' } },
        aggs: {
          count: {
            value_count: {
              field: 'osquery.key',
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
      // ENDPOINT NETWORK
      // =================================================================

      // Network - listening ports count
      'endpoint.network.listening_ports_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.port' } },
              { term: { 'osquery.state': 'LISTEN' } },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.port',
            },
          },
        },
      },

      // =================================================================
      // ENDPOINT HARDWARE (filter: has osquery.cpu_brand)
      // =================================================================
      'endpoint.hardware.cpu': {
        filter: { exists: { field: 'osquery.cpu_brand' } },
        aggs: {
          _value: {
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
          _value: {
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
          _value: {
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
          _value: {
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
          _value: {
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
          _value: {
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
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.firewall_enabled' }, { field: 'osquery.global_state' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      'endpoint.posture.secure_boot_raw': {
        filter: { exists: { field: 'osquery.secure_boot' } },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.secure_boot' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // Posture - macOS SIP (System Integrity Protection)
      'endpoint.posture.sip_enabled_raw': {
        filter: { exists: { field: 'osquery.config_flag' } },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.config_flag' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // Posture - macOS Gatekeeper
      'endpoint.posture.gatekeeper_enabled_raw': {
        filter: { exists: { field: 'osquery.assessments_enabled' } },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.assessments_enabled' }],
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
            must: [{ exists: { field: 'osquery.command' } }, { exists: { field: 'osquery.path' } }],
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
      // SECURITY: LOTL (Living Off The Land) DETECTIONS
      // =================================================================

      // Detections - Encoded PowerShell commands (LOTL attack indicator)
      'endpoint.security.encoded_powershell_count': {
        filter: {
          bool: {
            should: [
              { wildcard: { 'osquery.cmdline': '*-enc*' } },
              { wildcard: { 'osquery.cmdline': '*-EncodedCommand*' } },
              { wildcard: { 'osquery.cmdline': '*FromBase64String*' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          count: {
            value_count: {
              field: 'osquery.cmdline',
            },
          },
        },
      },

      // Detections - Hidden files in temp directories (evasion indicator)
      'endpoint.security.hidden_temp_files_count': {
        filter: {
          bool: {
            must: [
              { term: { 'osquery.hidden': '1' } },
              {
                bool: {
                  should: [
                    { wildcard: { 'osquery.path': '*tmp*' } },
                    { wildcard: { 'osquery.path': '*temp*' } },
                    { wildcard: { 'osquery.path': '*Temp*' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs: {
          count: {
            value_count: {
              field: 'osquery.path',
            },
          },
        },
      },

      // Detections - Listening on suspicious ports (C2/backdoor indicator)
      'endpoint.security.suspicious_ports_count': {
        filter: {
          bool: {
            must: [
              { term: { 'osquery.state': 'LISTEN' } },
              {
                bool: {
                  should: [
                    { term: { 'osquery.port': 4444 } },
                    { term: { 'osquery.port': 5555 } },
                    { term: { 'osquery.port': 6666 } },
                    { term: { 'osquery.port': 1337 } },
                    { term: { 'osquery.port': 31337 } },
                    { range: { 'osquery.port': { gte: 49152, lte: 65535 } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.port',
            },
          },
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
    version: '8.0.0',
    managed: true,
    managed_by: 'endpoint_assets',
    schema_version: 'caasm_v8_flattened_structure',
    entity_sub_type: ENTITY_SUB_TYPE.ENDPOINT,
    entity_source: ENTITY_SOURCE.OSQUERY,
    created_at: new Date().toISOString(),
    changelog:
      'Fixed ES transform underscore field filtering issue. Renamed aggregations from _host_* to tmp_host_* prefix (ES drops underscore-prefixed fields). Ingest pipeline flattens tmp_* fields to ECS paths then removes them.',
  },
});

/**
 * Index mapping for endpoint-assets-osquery-* index
 *
 * Schema is designed to be compatible with Entity Store for future integration.
 */
export const getAssetIndexMapping = () => ({
  mappings: {
    dynamic: 'true', // Allow unmapped fields from transform to be indexed
    dynamic_templates: [
      {
        // Map all string fields as keyword to allow aggregation in Entity Store
        // IMPORTANT: Without this, ES defaults strings to "text" type which cannot be aggregated
        strings_as_keywords: {
          match_mapping_type: 'string',
          mapping: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
    ],
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
              sip_enabled: { type: 'boolean' },
              sip_enabled_raw: { type: 'keyword' },
              gatekeeper_enabled: { type: 'boolean' },
              gatekeeper_enabled_raw: { type: 'keyword' },
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
              ssh_keys_count: { type: 'integer' },
              elevated_risk: { type: 'boolean' },
            },
          },
          drift: {
            properties: {
              last_change: { type: 'date' },
              change_types: { type: 'keyword' },
              recently_changed: { type: 'boolean' },
              events_24h: {
                properties: {
                  total: { type: 'integer' },
                  by_category: {
                    properties: {
                      privileges: { type: 'integer' },
                      persistence: { type: 'integer' },
                      network: { type: 'integer' },
                      software: { type: 'integer' },
                      posture: { type: 'integer' },
                    },
                  },
                  by_severity: {
                    properties: {
                      critical: { type: 'integer' },
                      high: { type: 'integer' },
                      medium: { type: 'integer' },
                      low: { type: 'integer' },
                    },
                  },
                },
              },
              recent_changes: {
                type: 'nested',
                properties: {
                  timestamp: { type: 'date' },
                  category: { type: 'keyword' },
                  action: { type: 'keyword' },
                  item_name: { type: 'keyword' },
                },
              },
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
              // LOTL detection counts
              encoded_powershell_count: { type: 'integer' },
              hidden_temp_files_count: { type: 'integer' },
              suspicious_ports_count: { type: 'integer' },
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
 * Get the ingest pipeline ID for the given namespace.
 */
export const getAssetIngestPipelineId = (namespace: string): string =>
  `endpoint-assets-ingest-${namespace}`;

/**
 * Ingest pipeline for post-processing transform output.
 *
 * This pipeline:
 * - Sets static entity fields (entity.sub_type, entity.source, asset.category)
 * - Converts raw posture values to boolean/enum
 * - Calculates posture score
 * - Sets event metadata
 */
export const getAssetIngestPipeline = (namespace: string) => ({
  id: getAssetIngestPipelineId(namespace),
  description: 'Post-process endpoint asset documents for Entity Store compatibility',
  processors: [
    // Initialize nested structures and extract tmp_ fields using Painless script
    // IMPORTANT: Must use containsKey() because top_metrics outputs keys with dots like "host.os.name"
    // Mustache templates don't work because they interpret dots as nested paths
    {
      script: {
        lang: 'painless',
        description: 'Initialize nested structures and extract tmp_ fields to ECS paths',
        source: `
          // Initialize nested structures
          if (ctx.host == null) { ctx.host = new HashMap(); }
          if (ctx.host.os == null) { ctx.host.os = new HashMap(); }
          if (ctx.agent == null) { ctx.agent = new HashMap(); }
          if (ctx.asset == null) { ctx.asset = new HashMap(); }
          if (ctx.entity == null) { ctx.entity = new HashMap(); }

          // Extract host fields from tmp_ prefixed top_metrics output
          if (ctx.tmp_host_id != null && ctx.tmp_host_id.containsKey('host.id')) {
            ctx.host.id = ctx.tmp_host_id['host.id'];
          }
          if (ctx.tmp_host_name != null && ctx.tmp_host_name.containsKey('host.name')) {
            ctx.host.name = ctx.tmp_host_name['host.name'];
          }
          if (ctx.tmp_host_hostname != null && ctx.tmp_host_hostname.containsKey('host.hostname')) {
            ctx.host.hostname = ctx.tmp_host_hostname['host.hostname'];
          }
          if (ctx.tmp_host_os_name != null && ctx.tmp_host_os_name.containsKey('host.os.name')) {
            ctx.host.os.name = ctx.tmp_host_os_name['host.os.name'];
          }
          if (ctx.tmp_host_os_version != null && ctx.tmp_host_os_version.containsKey('host.os.version')) {
            ctx.host.os.version = ctx.tmp_host_os_version['host.os.version'];
          }
          if (ctx.tmp_host_os_platform != null && ctx.tmp_host_os_platform.containsKey('host.os.platform')) {
            ctx.host.os.platform = ctx.tmp_host_os_platform['host.os.platform'];
          }
          if (ctx.tmp_host_os_family != null && ctx.tmp_host_os_family.containsKey('host.os.family')) {
            ctx.host.os.family = ctx.tmp_host_os_family['host.os.family'];
          }
          if (ctx.tmp_host_os_build != null && ctx.tmp_host_os_build.containsKey('host.os.build')) {
            ctx.host.os.build = ctx.tmp_host_os_build['host.os.build'];
          }
          if (ctx.tmp_host_os_kernel != null && ctx.tmp_host_os_kernel.containsKey('host.os.kernel')) {
            ctx.host.os.kernel = ctx.tmp_host_os_kernel['host.os.kernel'];
          }
          if (ctx.tmp_host_architecture != null && ctx.tmp_host_architecture.containsKey('host.architecture')) {
            ctx.host.architecture = ctx.tmp_host_architecture['host.architecture'];
          }
          if (ctx.tmp_host_ip != null && ctx.tmp_host_ip.containsKey('host.ip')) {
            ctx.host.ip = ctx.tmp_host_ip['host.ip'];
          }
          if (ctx.tmp_host_mac != null && ctx.tmp_host_mac.containsKey('host.mac')) {
            ctx.host.mac = ctx.tmp_host_mac['host.mac'];
          }

          // Extract agent fields
          if (ctx.tmp_agent_id != null && ctx.tmp_agent_id.containsKey('agent.id')) {
            ctx.agent.id = ctx.tmp_agent_id['agent.id'];
          }
          if (ctx.tmp_agent_name != null && ctx.tmp_agent_name.containsKey('agent.name')) {
            ctx.agent.name = ctx.tmp_agent_name['agent.name'];
          }
          if (ctx.tmp_agent_type != null && ctx.tmp_agent_type.containsKey('agent.type')) {
            ctx.agent.type = ctx.tmp_agent_type['agent.type'];
          }
          if (ctx.tmp_agent_version != null && ctx.tmp_agent_version.containsKey('agent.version')) {
            ctx.agent.version = ctx.tmp_agent_version['agent.version'];
          }

          // Extract asset platform
          if (ctx.tmp_asset_platform != null && ctx.tmp_asset_platform.containsKey('host.os.platform')) {
            ctx.asset.platform = ctx.tmp_asset_platform['host.os.platform'];
          }
        `,
      },
    },
    // Extract nested filter aggregation structures (endpoint.hardware.*, endpoint.posture.*_raw)
    {
      script: {
        lang: 'painless',
        description: 'Flatten nested filter aggregation structures',
        source: `
          // Initialize endpoint structure if needed
          if (ctx.endpoint == null) { ctx.endpoint = new HashMap(); }
          if (ctx.endpoint.hardware == null) { ctx.endpoint.hardware = new HashMap(); }
          if (ctx.endpoint.posture == null) { ctx.endpoint.posture = new HashMap(); }

          // Hardware fields from filtered aggregations
          // Extract first non-null value from top_metrics {field_name: value} format
          if (ctx.endpoint.hardware.cpu != null && ctx.endpoint.hardware.cpu._value != null) {
            def v = ctx.endpoint.hardware.cpu._value;
            if (v instanceof Map) { for (e in v.entrySet()) { if (e.getValue() != null) { ctx.endpoint.hardware.cpu = e.getValue(); break; } } }
          }
          if (ctx.endpoint.hardware.cpu_cores != null && ctx.endpoint.hardware.cpu_cores._value != null) {
            def v = ctx.endpoint.hardware.cpu_cores._value;
            if (v instanceof Map) { for (e in v.entrySet()) { if (e.getValue() != null) { ctx.endpoint.hardware.cpu_cores = e.getValue(); break; } } }
          }
          if (ctx.endpoint.hardware.memory_gb != null && ctx.endpoint.hardware.memory_gb._value != null) {
            def v = ctx.endpoint.hardware.memory_gb._value;
            if (v instanceof Map) { for (e in v.entrySet()) { if (e.getValue() != null) { ctx.endpoint.hardware.memory_gb = e.getValue(); break; } } }
          }
          if (ctx.endpoint.hardware.vendor != null && ctx.endpoint.hardware.vendor._value != null) {
            def v = ctx.endpoint.hardware.vendor._value;
            if (v instanceof Map) { for (e in v.entrySet()) { if (e.getValue() != null) { ctx.endpoint.hardware.vendor = e.getValue(); break; } } }
          }
          if (ctx.endpoint.hardware.model != null && ctx.endpoint.hardware.model._value != null) {
            def v = ctx.endpoint.hardware.model._value;
            if (v instanceof Map) { for (e in v.entrySet()) { if (e.getValue() != null) { ctx.endpoint.hardware.model = e.getValue(); break; } } }
          }

          // Memory fields from filtered aggregations
          // Flatten endpoint.memory nested structure from transform output
          if (ctx.endpoint.memory == null) { ctx.endpoint.memory = new HashMap(); }
          if (ctx.endpoint.memory.total != null && ctx.endpoint.memory.total instanceof Map) {
            def memTotal = ctx.endpoint.memory.total;
            if (memTotal.containsKey('osquery.memory_total')) {
              ctx.endpoint.memory.total = memTotal['osquery.memory_total'];
            } else {
              for (e in memTotal.entrySet()) { if (e.getValue() != null && !(e.getValue() instanceof Map)) { ctx.endpoint.memory.total = e.getValue(); break; } }
            }
          }
          if (ctx.endpoint.memory.free != null && ctx.endpoint.memory.free instanceof Map) {
            def memFree = ctx.endpoint.memory.free;
            if (memFree.containsKey('osquery.memory_free')) {
              ctx.endpoint.memory.free = memFree['osquery.memory_free'];
            } else {
              for (e in memFree.entrySet()) { if (e.getValue() != null && !(e.getValue() instanceof Map)) { ctx.endpoint.memory.free = e.getValue(); break; } }
            }
          }
          if (ctx.endpoint.memory.available != null && ctx.endpoint.memory.available instanceof Map) {
            def memAvail = ctx.endpoint.memory.available;
            if (memAvail.containsKey('osquery.memory_available')) {
              ctx.endpoint.memory.available = memAvail['osquery.memory_available'];
            } else {
              for (e in memAvail.entrySet()) { if (e.getValue() != null && !(e.getValue() instanceof Map)) { ctx.endpoint.memory.available = e.getValue(); break; } }
            }
          }
          // Remove doc_count from memory if present (artifact of filter aggregation)
          if (ctx.endpoint.memory.containsKey('doc_count')) {
            ctx.endpoint.memory.remove('doc_count');
          }

          // Initialize privileges structure
          if (ctx.endpoint.privileges == null) { ctx.endpoint.privileges = new HashMap(); }

          // Flatten privileges.local_admins - extract admin usernames from terms aggregation
          if (ctx.endpoint.privileges.local_admins != null) {
            def localAdmins = ctx.endpoint.privileges.local_admins;
            if (localAdmins instanceof Map && localAdmins.containsKey('admins_list')) {
              def adminsList = localAdmins.admins_list;
              if (adminsList instanceof Map && adminsList.containsKey('buckets')) {
                def buckets = adminsList.buckets;
                def adminNames = new ArrayList();
                for (bucket in buckets) {
                  if (bucket.containsKey('key')) {
                    adminNames.add(bucket.key);
                  }
                }
                ctx.endpoint.privileges.local_admins = adminNames;
              } else {
                ctx.endpoint.privileges.local_admins = [];
              }
            } else if (!(localAdmins instanceof List)) {
              ctx.endpoint.privileges.local_admins = [];
            }
          }

          // Flatten privileges.admin_count - extract count value from cardinality aggregation
          if (ctx.endpoint.privileges.admin_count != null) {
            def adminCount = ctx.endpoint.privileges.admin_count;
            if (adminCount instanceof Map && adminCount.containsKey('count')) {
              def countObj = adminCount.count;
              if (countObj instanceof Map && countObj.containsKey('value')) {
                ctx.endpoint.privileges.admin_count = countObj.value;
              } else if (countObj instanceof Number) {
                ctx.endpoint.privileges.admin_count = countObj;
              } else {
                ctx.endpoint.privileges.admin_count = 0;
              }
            } else if (!(adminCount instanceof Number)) {
              ctx.endpoint.privileges.admin_count = 0;
            }
          }

          // Flatten privileges.root_users - extract usernames from terms aggregation
          if (ctx.endpoint.privileges.root_users != null) {
            def rootUsers = ctx.endpoint.privileges.root_users;
            if (rootUsers instanceof Map && rootUsers.containsKey('root_list')) {
              def rootList = rootUsers.root_list;
              if (rootList instanceof Map && rootList.containsKey('buckets')) {
                def buckets = rootList.buckets;
                def userNames = new ArrayList();
                for (bucket in buckets) {
                  if (bucket.containsKey('key')) {
                    userNames.add(bucket.key);
                  }
                }
                ctx.endpoint.privileges.root_users = userNames;
              } else {
                ctx.endpoint.privileges.root_users = [];
              }
            } else if (!(rootUsers instanceof List)) {
              ctx.endpoint.privileges.root_users = [];
            }
          }

          // Set elevated_risk based on admin count
          def adminCountVal = ctx.endpoint.privileges.admin_count;
          ctx.endpoint.privileges.elevated_risk = (adminCountVal != null && adminCountVal > 2);

          // Initialize security structure and flatten security detection fields
          if (ctx.endpoint.security == null) { ctx.endpoint.security = new HashMap(); }

          // Flatten suspicious_tasks fields - extract values from top_metrics format
          if (ctx.endpoint.security.suspicious_tasks != null) {
            def tasks = ctx.endpoint.security.suspicious_tasks;
            if (tasks instanceof Map) {
              def flatTasks = new HashMap();
              flatTasks.doc_count = tasks.containsKey('doc_count') ? tasks.doc_count : 0;
              // Extract values from latest_* fields (top_metrics format: {osquery.field: value})
              for (def key : ['latest_name', 'latest_detection_method', 'latest_detection_reason', 'latest_command_line']) {
                if (tasks.containsKey(key) && tasks[key] instanceof Map) {
                  for (e in tasks[key].entrySet()) { if (e.getValue() != null) { flatTasks[key] = e.getValue(); break; } }
                }
              }
              ctx.endpoint.security.suspicious_tasks = flatTasks;
            }
          }

          // Flatten suspicious_services fields
          if (ctx.endpoint.security.suspicious_services != null) {
            def services = ctx.endpoint.security.suspicious_services;
            if (services instanceof Map) {
              def flatServices = new HashMap();
              flatServices.doc_count = services.containsKey('doc_count') ? services.doc_count : 0;
              for (def key : ['latest_name', 'latest_path', 'latest_signature_status']) {
                if (services.containsKey(key) && services[key] instanceof Map) {
                  for (e in services[key].entrySet()) { if (e.getValue() != null) { flatServices[key] = e.getValue(); break; } }
                }
              }
              ctx.endpoint.security.suspicious_services = flatServices;
            }
          }

          // Flatten services fields
          if (ctx.endpoint.services != null) {
            def svc = ctx.endpoint.services;
            if (svc instanceof Map) {
              def flatSvc = new HashMap();
              flatSvc.doc_count = svc.containsKey('doc_count') ? svc.doc_count : 0;
              for (def key : ['latest_name', 'latest_status']) {
                if (svc.containsKey(key) && svc[key] instanceof Map) {
                  for (e in svc[key].entrySet()) { if (e.getValue() != null) { flatSvc[key] = e.getValue(); break; } }
                }
              }
              ctx.endpoint.services = flatSvc;
            }
          }

          // Flatten software counts
          if (ctx.endpoint.software != null) {
            def sw = ctx.endpoint.software;
            if (sw instanceof Map) {
              if (sw.containsKey('installed_count') && sw.installed_count instanceof Map) {
                def ic = sw.installed_count;
                ctx.endpoint.software.installed_count = ic.containsKey('count') ?
                  (ic.count instanceof Map ? ic.count.value : ic.count) : 0;
              }
              if (sw.containsKey('services_count') && sw.services_count instanceof Map) {
                def sc = sw.services_count;
                ctx.endpoint.software.services_count = sc.containsKey('count') ?
                  (sc.count instanceof Map ? sc.count.value : sc.count) : 0;
              }
            }
          }

          // Posture raw fields from filtered aggregations
          // IMPORTANT: If no data was collected (no _value), set to null so scoring knows there's no data
          if (ctx.endpoint.posture.disk_encryption_raw != null) {
            if (ctx.endpoint.posture.disk_encryption_raw._value != null) {
              def encValue = ctx.endpoint.posture.disk_encryption_raw._value;
              if (encValue.containsKey('osquery.encrypted')) {
                ctx.endpoint.posture.disk_encryption_raw = encValue['osquery.encrypted'];
              } else {
                ctx.endpoint.posture.disk_encryption_raw = null;
              }
            } else {
              // No data collected - set to null
              ctx.endpoint.posture.disk_encryption_raw = null;
            }
          }
          if (ctx.endpoint.posture.firewall_enabled_raw != null) {
            if (ctx.endpoint.posture.firewall_enabled_raw._value != null) {
              def fwValue = ctx.endpoint.posture.firewall_enabled_raw._value;
              if (fwValue.containsKey('osquery.firewall_enabled')) {
                ctx.endpoint.posture.firewall_enabled_raw = fwValue['osquery.firewall_enabled'];
              } else if (fwValue.containsKey('osquery.global_state')) {
                ctx.endpoint.posture.firewall_enabled_raw = fwValue['osquery.global_state'];
              } else {
                ctx.endpoint.posture.firewall_enabled_raw = null;
              }
            } else {
              // No data collected - set to null
              ctx.endpoint.posture.firewall_enabled_raw = null;
            }
          }
          if (ctx.endpoint.posture.secure_boot_raw != null) {
            if (ctx.endpoint.posture.secure_boot_raw._value != null) {
              def sbValue = ctx.endpoint.posture.secure_boot_raw._value;
              if (sbValue.containsKey('osquery.secure_boot')) {
                ctx.endpoint.posture.secure_boot_raw = sbValue['osquery.secure_boot'];
              } else {
                ctx.endpoint.posture.secure_boot_raw = null;
              }
            } else {
              // No data collected - set to null
              ctx.endpoint.posture.secure_boot_raw = null;
            }
          }

          // macOS SIP (System Integrity Protection)
          if (ctx.endpoint.posture.sip_enabled_raw != null) {
            if (ctx.endpoint.posture.sip_enabled_raw._value != null) {
              def sipValue = ctx.endpoint.posture.sip_enabled_raw._value;
              if (sipValue.containsKey('osquery.config_flag')) {
                ctx.endpoint.posture.sip_enabled_raw = sipValue['osquery.config_flag'];
              } else {
                ctx.endpoint.posture.sip_enabled_raw = null;
              }
            } else {
              ctx.endpoint.posture.sip_enabled_raw = null;
            }
          }

          // macOS Gatekeeper
          if (ctx.endpoint.posture.gatekeeper_enabled_raw != null) {
            if (ctx.endpoint.posture.gatekeeper_enabled_raw._value != null) {
              def gkValue = ctx.endpoint.posture.gatekeeper_enabled_raw._value;
              if (gkValue.containsKey('osquery.assessments_enabled')) {
                ctx.endpoint.posture.gatekeeper_enabled_raw = gkValue['osquery.assessments_enabled'];
              } else {
                ctx.endpoint.posture.gatekeeper_enabled_raw = null;
              }
            } else {
              ctx.endpoint.posture.gatekeeper_enabled_raw = null;
            }
          }

          // Flatten network listening_ports_count
          if (ctx.endpoint.network == null) { ctx.endpoint.network = new HashMap(); }
          if (ctx.endpoint.network.listening_ports_count != null) {
            def lpc = ctx.endpoint.network.listening_ports_count;
            if (lpc instanceof Map && lpc.containsKey('count')) {
              def countObj = lpc.count;
              if (countObj instanceof Map && countObj.containsKey('value')) {
                ctx.endpoint.network.listening_ports_count = countObj.value;
              } else if (countObj instanceof Number) {
                ctx.endpoint.network.listening_ports_count = countObj;
              } else {
                ctx.endpoint.network.listening_ports_count = 0;
              }
            } else if (!(lpc instanceof Number)) {
              ctx.endpoint.network.listening_ports_count = 0;
            }
          }

          // Flatten privileges.ssh_keys_count
          if (ctx.endpoint.privileges.ssh_keys_count != null) {
            def skc = ctx.endpoint.privileges.ssh_keys_count;
            if (skc instanceof Map && skc.containsKey('count')) {
              def countObj = skc.count;
              if (countObj instanceof Map && countObj.containsKey('value')) {
                ctx.endpoint.privileges.ssh_keys_count = countObj.value;
              } else if (countObj instanceof Number) {
                ctx.endpoint.privileges.ssh_keys_count = countObj;
              } else {
                ctx.endpoint.privileges.ssh_keys_count = 0;
              }
            } else if (!(skc instanceof Number)) {
              ctx.endpoint.privileges.ssh_keys_count = 0;
            }
          }

          // Flatten security LOTL detection counts
          if (ctx.endpoint.security.encoded_powershell_count != null) {
            def epc = ctx.endpoint.security.encoded_powershell_count;
            if (epc instanceof Map && epc.containsKey('count')) {
              def countObj = epc.count;
              if (countObj instanceof Map && countObj.containsKey('value')) {
                ctx.endpoint.security.encoded_powershell_count = countObj.value;
              } else if (countObj instanceof Number) {
                ctx.endpoint.security.encoded_powershell_count = countObj;
              } else {
                ctx.endpoint.security.encoded_powershell_count = 0;
              }
            } else if (!(epc instanceof Number)) {
              ctx.endpoint.security.encoded_powershell_count = 0;
            }
          }

          if (ctx.endpoint.security.hidden_temp_files_count != null) {
            def htfc = ctx.endpoint.security.hidden_temp_files_count;
            if (htfc instanceof Map && htfc.containsKey('count')) {
              def countObj = htfc.count;
              if (countObj instanceof Map && countObj.containsKey('value')) {
                ctx.endpoint.security.hidden_temp_files_count = countObj.value;
              } else if (countObj instanceof Number) {
                ctx.endpoint.security.hidden_temp_files_count = countObj;
              } else {
                ctx.endpoint.security.hidden_temp_files_count = 0;
              }
            } else if (!(htfc instanceof Number)) {
              ctx.endpoint.security.hidden_temp_files_count = 0;
            }
          }

          if (ctx.endpoint.security.suspicious_ports_count != null) {
            def spc = ctx.endpoint.security.suspicious_ports_count;
            if (spc instanceof Map && spc.containsKey('count')) {
              def countObj = spc.count;
              if (countObj instanceof Map && countObj.containsKey('value')) {
                ctx.endpoint.security.suspicious_ports_count = countObj.value;
              } else if (countObj instanceof Number) {
                ctx.endpoint.security.suspicious_ports_count = countObj;
              } else {
                ctx.endpoint.security.suspicious_ports_count = 0;
              }
            } else if (!(spc instanceof Number)) {
              ctx.endpoint.security.suspicious_ports_count = 0;
            }
          }
        `,
      },
    },
    // Remove temporary tmp_* fields after flattening
    {
      remove: {
        field: [
          'tmp_host_id',
          'tmp_host_name',
          'tmp_host_hostname',
          'tmp_host_os_name',
          'tmp_host_os_version',
          'tmp_host_os_platform',
          'tmp_host_os_family',
          'tmp_host_os_build',
          'tmp_host_os_kernel',
          'tmp_host_architecture',
          'tmp_host_ip',
          'tmp_host_mac',
          'tmp_agent_id',
          'tmp_agent_name',
          'tmp_agent_type',
          'tmp_agent_version',
          'tmp_asset_platform',
        ],
        ignore_missing: true,
      },
    },
    // Set static entity fields
    {
      set: {
        field: 'entity.type',
        value: ENTITY_TYPE.HOST,
      },
    },
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
    // Copy entity.id and entity.name from host fields if not already set by transform group_by
    {
      script: {
        lang: 'painless',
        description: 'Copy entity.id/name from host if not set',
        source: `
          if (ctx.entity == null) { ctx.entity = new HashMap(); }
          if (ctx.entity.id == null && ctx.host != null && ctx.host.id != null) {
            ctx.entity.id = ctx.host.id;
          }
          if (ctx.entity.name == null && ctx.host != null && ctx.host.name != null) {
            ctx.entity.name = ctx.host.name;
          }
        `,
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
    // Convert sip_enabled_raw to boolean (macOS System Integrity Protection)
    // SIP config_flag values: CS_ENFORCEMENT is enabled when SIP is on
    {
      script: {
        source: `
          def raw = ctx.endpoint?.posture?.sip_enabled_raw;
          // SIP is considered enabled if config_flag contains enforcement flags
          ctx.endpoint.posture.sip_enabled = (raw != null && raw != '' && raw != '0');
        `,
      },
    },
    // Convert gatekeeper_enabled_raw to boolean (macOS Gatekeeper)
    {
      script: {
        source: `
          def raw = ctx.endpoint?.posture?.gatekeeper_enabled_raw;
          ctx.endpoint.posture.gatekeeper_enabled = (raw == '1' || raw == 'true' || raw == 'yes');
        `,
      },
    },
    // Calculate posture score and level
    // IMPORTANT: Only deduct points if we have DATA showing the feature is disabled.
    // If no data was collected (raw field is null), it's UNKNOWN - don't deduct.
    {
      script: {
        lang: 'painless',
        source: `
          int score = 100;
          def failedChecks = new ArrayList();
          int checksWithData = 0;

          // Disk encryption check (-25)
          // Only deduct if we have data AND it shows disabled
          def diskEnc = ctx.endpoint?.posture?.disk_encryption;
          if (diskEnc == 'FAIL') {
            score -= 25;
            failedChecks.add('disk_encryption');
            checksWithData++;
          } else if (diskEnc == 'OK') {
            checksWithData++;
          }
          // If diskEnc is 'UNKNOWN', we don't count it (no data)

          // Firewall check (-20)
          // Only deduct if we have RAW data AND it shows disabled
          def firewallRaw = ctx.endpoint?.posture?.firewall_enabled_raw;
          def firewall = ctx.endpoint?.posture?.firewall_enabled;
          if (firewallRaw != null && firewallRaw != '') {
            checksWithData++;
            if (firewall == false) {
              score -= 20;
              failedChecks.add('firewall_disabled');
            }
          }
          // If firewallRaw is null, no data was collected - don't deduct

          // Secure boot check (-15)
          // Only deduct if we have RAW data AND it shows disabled
          def secureBootRaw = ctx.endpoint?.posture?.secure_boot_raw;
          def secureBoot = ctx.endpoint?.posture?.secure_boot;
          if (secureBootRaw != null && secureBootRaw != '') {
            checksWithData++;
            if (secureBoot == false) {
              score -= 15;
              failedChecks.add('secure_boot_disabled');
            }
          }
          // If secureBootRaw is null, no data was collected - don't deduct

          // Admin count check (-10)
          // Handle both nested structure from transform {count: {value: X}} and flattened number
          def adminCountObj = ctx.endpoint?.privileges?.admin_count;
          def adminCount = null;
          if (adminCountObj != null) {
            if (adminCountObj instanceof Number) {
              adminCount = adminCountObj;
            } else if (adminCountObj instanceof Map && adminCountObj.containsKey('count')) {
              def countObj = adminCountObj.count;
              if (countObj instanceof Number) {
                adminCount = countObj;
              } else if (countObj instanceof Map && countObj.containsKey('value')) {
                adminCount = countObj.value;
              }
            }
          }
          if (adminCount != null) {
            checksWithData++;
            if (adminCount > 2) {
              score -= 10;
              failedChecks.add('excessive_admins');
            }
          }

          // macOS SIP check (-15) - only for macOS systems
          def sipRaw = ctx.endpoint?.posture?.sip_enabled_raw;
          def sipEnabled = ctx.endpoint?.posture?.sip_enabled;
          if (sipRaw != null && sipRaw != '') {
            checksWithData++;
            if (sipEnabled == false) {
              score -= 15;
              failedChecks.add('sip_disabled');
            }
          }

          // macOS Gatekeeper check (-10) - only for macOS systems
          def gatekeeperRaw = ctx.endpoint?.posture?.gatekeeper_enabled_raw;
          def gatekeeperEnabled = ctx.endpoint?.posture?.gatekeeper_enabled;
          if (gatekeeperRaw != null && gatekeeperRaw != '') {
            checksWithData++;
            if (gatekeeperEnabled == false) {
              score -= 10;
              failedChecks.add('gatekeeper_disabled');
            }
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
          // Total checks is based on how many checks had data
          def totalChecks = checksWithData;
          def passedChecks = checksWithData - failedChecks.size();
          ctx.endpoint.posture.checks = new HashMap();
          ctx.endpoint.posture.checks.passed = passedChecks;
          ctx.endpoint.posture.checks.failed = failedChecks.size();
          ctx.endpoint.posture.checks.total = totalChecks;
        `,
      },
    },
  ],
});

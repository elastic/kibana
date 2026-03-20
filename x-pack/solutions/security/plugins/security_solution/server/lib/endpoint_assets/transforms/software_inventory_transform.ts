/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TransformPutTransformRequest,
  MappingTypeMapping,
  IngestPipeline,
} from '@elastic/elasticsearch/lib/api/types';
import {
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_DELAY,
} from '../../../../common/endpoint_assets';

/**
 * Software Inventory Transform Configuration
 *
 * This transform:
 * - Reads from logs-osquery_manager.result-* (osquery results)
 * - Filters for software-related queries (installed_apps, programs, services, etc.)
 * - Groups by host.name + software name to create one document per software per host
 * - Tracks first_seen and last_seen timestamps
 * - Outputs to software-inventory-osquery-{namespace}
 *
 * This provides a "current state" view of software inventory across all endpoints.
 */

export const SOFTWARE_INVENTORY_TRANSFORM_PREFIX = 'software_inventory_';
export const SOFTWARE_INVENTORY_INDEX_PREFIX = 'software-inventory-osquery-';
export const SOFTWARE_INVENTORY_PIPELINE_PREFIX = 'software-inventory-ingest-';

// Software-related osquery action_id patterns
const SOFTWARE_ACTION_PATTERNS = [
  '*installed_packages*',
  '*installed_apps*',
  '*programs*',
  '*homebrew*',
  '*deb_packages*',
  '*rpm_packages*',
  '*services*',
  '*launchd*',
  '*systemd*',
];

export const getSoftwareInventoryTransformId = (namespace: string): string =>
  `${SOFTWARE_INVENTORY_TRANSFORM_PREFIX}${namespace}`;

export const getSoftwareInventoryIndexPattern = (namespace: string): string =>
  `${SOFTWARE_INVENTORY_INDEX_PREFIX}${namespace}`;

export const getSoftwareInventoryPipelineId = (namespace: string): string =>
  `${SOFTWARE_INVENTORY_PIPELINE_PREFIX}${namespace}`;

/**
 * Index mapping for software inventory documents
 */
export const getSoftwareInventoryIndexMapping = (): MappingTypeMapping => ({
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },

    // Host identification
    host: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        os: {
          properties: {
            platform: { type: 'keyword' },
            name: { type: 'keyword' },
            version: { type: 'keyword' },
          },
        },
      },
    },

    // Agent info
    agent: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
      },
    },

    // Software details
    software: {
      properties: {
        name: { type: 'keyword' },
        version: { type: 'keyword' },
        type: { type: 'keyword' }, // application, package, service
        path: { type: 'keyword' },
        publisher: { type: 'keyword' },
        description: { type: 'text' },
        // Service-specific
        status: { type: 'keyword' },
        start_type: { type: 'keyword' },
        user_account: { type: 'keyword' },
        pid: { type: 'long' },
        // Package-specific
        arch: { type: 'keyword' },
        size: { type: 'long' },
        // macOS-specific
        bundle_id: { type: 'keyword' },
      },
    },

    // Lifecycle tracking
    first_seen: { type: 'date' },
    last_seen: { type: 'date' },

    // Source tracking
    source: {
      properties: {
        action_id: { type: 'keyword' },
        query_name: { type: 'keyword' },
      },
    },
  },
});

/**
 * Ingest pipeline to normalize software inventory documents
 *
 * This pipeline:
 * 1. Sets @timestamp from last_seen
 * 2. Flattens nested top_metrics aggregation results (e.g., {osquery.version: "1.0"} -> "1.0")
 * 3. Determines software type from action_id
 */
export const getSoftwareInventoryPipeline = (namespace: string): IngestPipeline => ({
  description: 'Normalizes software inventory documents from osquery transform',
  processors: [
    // Set @timestamp to last_seen
    {
      set: {
        field: '@timestamp',
        value: '{{last_seen}}',
        ignore_failure: true,
      },
    },
    // Flatten nested top_metrics fields and determine software type
    {
      script: {
        lang: 'painless',
        description: 'Flatten nested top_metrics fields and determine software type',
        source: `
          // Helper function to extract value from nested top_metrics result
          def getVal(def obj, String key) {
            if (obj != null && obj instanceof Map) {
              def v = ((Map)obj).get(key);
              return (v != null && !v.toString().equals('null')) ? v : null;
            }
            return obj;
          }

          // Initialize software object if needed
          if (ctx.software == null) { ctx.software = new HashMap(); }

          // Flatten software fields
          ctx.software.version = getVal(ctx.software.version, 'osquery.version');
          ctx.software.path = getVal(ctx.software.path, 'osquery.path');
          ctx.software.publisher = getVal(ctx.software.publisher, 'osquery.publisher');
          ctx.software.status = getVal(ctx.software.status, 'osquery.status');
          ctx.software.start_type = getVal(ctx.software.start_type, 'osquery.start_type');
          ctx.software.user_account = getVal(ctx.software.user_account, 'osquery.user_account');
          ctx.software.arch = getVal(ctx.software.arch, 'osquery.arch');
          ctx.software.bundle_id = getVal(ctx.software.bundle_id, 'osquery.bundle_identifier');
          ctx.software.pid = getVal(ctx.software.pid, 'osquery.pid');
          ctx.software.size = getVal(ctx.software.size, 'osquery.size');

          // Flatten host fields
          if (ctx.host != null) {
            ctx.host.id = getVal(ctx.host.id, 'host.id');
            if (ctx.host.os != null) {
              ctx.host.os.platform = getVal(ctx.host.os.platform, 'host.os.platform');
              ctx.host.os.name = getVal(ctx.host.os.name, 'host.os.name');
              ctx.host.os.version = getVal(ctx.host.os.version, 'host.os.version');
            }
          }

          // Flatten agent fields
          if (ctx.agent != null) {
            ctx.agent.id = getVal(ctx.agent.id, 'agent.id');
            ctx.agent.name = getVal(ctx.agent.name, 'agent.name');
          }

          // Flatten source fields and determine software type
          def actionIdRaw = ctx.source?.action_id;
          String actionId = getVal(actionIdRaw, 'action_id')?.toString();
          if (ctx.source == null) { ctx.source = new HashMap(); }
          ctx.source.action_id = actionId;

          // Determine software type based on action_id
          if (actionId == null || actionId.isEmpty()) {
            ctx.software.type = 'application';
          } else {
            String actionIdLower = actionId.toLowerCase();
            if (actionIdLower.contains('services') || actionIdLower.contains('launchd') || actionIdLower.contains('systemd')) {
              ctx.software.type = 'service';
            } else if (actionIdLower.contains('deb_packages') || actionIdLower.contains('rpm_packages') ||
                       actionIdLower.contains('homebrew') || actionIdLower.contains('installed_packages')) {
              ctx.software.type = 'package';
            } else {
              ctx.software.type = 'application';
            }
          }
        `,
        ignore_failure: true,
      },
    },
  ],
});

/**
 * Transform configuration for software inventory
 *
 * Note: Elasticsearch transforms don't support runtime fields in group_by,
 * so we use a scripted_metric approach to extract and normalize software names.
 * This transform groups by host.name + osquery.name (the most common software name field)
 * and uses scripted_metric to get values from alternative fields when osquery.name is missing.
 */
export const getSoftwareInventoryTransformConfig = (
  namespace: string
): TransformPutTransformRequest => ({
  transform_id: getSoftwareInventoryTransformId(namespace),
  description:
    'Aggregates osquery results into software inventory documents. Tracks current software state per host.',
  source: {
    index: [`logs-osquery_manager.result-${namespace}`],
    query: {
      bool: {
        filter: [
          // Must have host identification
          {
            exists: {
              field: 'host.name',
            },
          },
          // Filter for software-related queries
          {
            bool: {
              should: SOFTWARE_ACTION_PATTERNS.map((pattern) => ({
                wildcard: { action_id: { value: pattern } },
              })),
              minimum_should_match: 1,
            },
          },
          // Must have some name field to identify the software
          {
            bool: {
              should: [
                { exists: { field: 'osquery.name' } },
                { exists: { field: 'osquery.display_name' } },
                { exists: { field: 'osquery.label' } },
                { exists: { field: 'osquery.id' } },
                { exists: { field: 'osquery.unit' } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    // Use runtime field to normalize the software name across different query types
    // Note: osquery fields are mapped as keyword type directly, not with .keyword subfield
    runtime_mappings: {
      software_name: {
        type: 'keyword',
        script: {
          source: `
            def name = null;
            if (doc.containsKey('osquery.name') && doc['osquery.name'].size() > 0) {
              name = doc['osquery.name'].value;
            } else if (doc.containsKey('osquery.display_name') && doc['osquery.display_name'].size() > 0) {
              name = doc['osquery.display_name'].value;
            } else if (doc.containsKey('osquery.label') && doc['osquery.label'].size() > 0) {
              name = doc['osquery.label'].value;
            } else if (doc.containsKey('osquery.id') && doc['osquery.id'].size() > 0) {
              name = doc['osquery.id'].value;
            } else if (doc.containsKey('osquery.unit') && doc['osquery.unit'].size() > 0) {
              name = doc['osquery.unit'].value;
            }
            if (name != null) {
              emit(name);
            }
          `,
        },
      },
    },
  },
  dest: {
    index: getSoftwareInventoryIndexPattern(namespace),
    pipeline: getSoftwareInventoryPipelineId(namespace),
  },
  pivot: {
    group_by: {
      // Group by host + software name to get unique software per host
      'host.name': {
        terms: {
          field: 'host.name',
        },
      },
      'software.name': {
        terms: {
          field: 'software_name', // Use the runtime field
        },
      },
    },
    aggregations: {
      // Host information
      'host.id': {
        top_metrics: {
          metrics: [{ field: 'host.id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      'host.os.platform': {
        top_metrics: {
          metrics: [{ field: 'host.os.platform' }],
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

      // Agent information
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

      // Software version (try multiple fields)
      'software.version': {
        top_metrics: {
          metrics: [{ field: 'osquery.version' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Software path
      'software.path': {
        top_metrics: {
          metrics: [{ field: 'osquery.path' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Publisher/vendor
      'software.publisher': {
        top_metrics: {
          metrics: [{ field: 'osquery.publisher' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Service status
      'software.status': {
        top_metrics: {
          metrics: [{ field: 'osquery.status' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Service start type
      'software.start_type': {
        top_metrics: {
          metrics: [{ field: 'osquery.start_type' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Service user account
      'software.user_account': {
        top_metrics: {
          metrics: [{ field: 'osquery.user_account' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // PID for services
      'software.pid': {
        top_metrics: {
          metrics: [{ field: 'osquery.pid' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Architecture
      'software.arch': {
        top_metrics: {
          metrics: [{ field: 'osquery.arch' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Size
      'software.size': {
        top_metrics: {
          metrics: [{ field: 'osquery.size' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // macOS bundle identifier
      'software.bundle_id': {
        top_metrics: {
          metrics: [{ field: 'osquery.bundle_identifier' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Source tracking
      'source.action_id': {
        top_metrics: {
          metrics: [{ field: 'action_id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Lifecycle tracking
      first_seen: {
        min: {
          field: '@timestamp',
        },
      },
      last_seen: {
        max: {
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
    max_page_search_size: 500,
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Endpoint Asset Visibility & Security Posture - Constants
 *
 * Schema is designed to be compatible with:
 * - Entity Store (.entities.v1.latest.security_*)
 * - Asset Inventory (entities-generic-latest)
 * - ECS (host.*, agent.*)
 *
 * @see /Users/tomaszciecierski/Projects/elastic/kibana/.claude/plans/asset-management/schema-alignment-entity-store.md
 */

// =============================================================================
// INDEX PATTERNS
// =============================================================================

/** Index for endpoint asset documents (avoids data stream template conflicts) */
export const ENDPOINT_ASSETS_INDEX_PATTERN = 'endpoint-assets-osquery-*';

/** Historical snapshots index (Phase 2) */
export const ENDPOINT_ASSETS_HISTORY_INDEX_PATTERN = 'asset_manager_history-*';

/** Source index for osquery results */
export const OSQUERY_MANAGER_INDEX_PATTERN = 'logs-osquery_manager.*';

/** Entity Store host index (for future integration) */
export const ENTITY_STORE_HOST_INDEX_PATTERN = '.entities.v1.latest.security_host_*';

/** Software inventory index (from dedicated transform) */
export const SOFTWARE_INVENTORY_INDEX_PATTERN = 'software-inventory-osquery-*';

// =============================================================================
// TRANSFORM CONFIGURATION
// =============================================================================

/** Transform ID prefix */
export const ENDPOINT_ASSET_FACTS_TRANSFORM_PREFIX = 'endpoint_asset_facts_';

/** Query naming convention prefix for osquery */
export const ASSET_QUERY_PREFIX = 'Asset – ';

/** Default transform frequency */
export const DEFAULT_TRANSFORM_FREQUENCY = '5m';

/** Default transform sync delay */
export const DEFAULT_TRANSFORM_DELAY = '1m';

/** Default data retention in days */
export const DEFAULT_RETENTION_DAYS = 90;

// =============================================================================
// ENTITY FIELDS (Compatible with Entity Store)
// =============================================================================

export const ENTITY_FIELDS = {
  /** Primary identifier - maps to host.id */
  ID: 'entity.id',
  /** Display name - maps to host.name */
  NAME: 'entity.name',
  /** Entity type - always 'host' for endpoints */
  TYPE: 'entity.type',
  /** Sub-type to differentiate from cloud hosts */
  SUB_TYPE: 'entity.sub_type',
  /** Data source identifier */
  SOURCE: 'entity.source',
  /** Risk level from Risk Engine (future) */
  RISK_LEVEL: 'entity.risk.calculated_level',
  /** Risk score from Risk Engine (future) */
  RISK_SCORE: 'entity.risk.calculated_score',
} as const;

// =============================================================================
// ASSET FIELDS (Compatible with Asset Inventory)
// =============================================================================

export const ASSET_FIELDS = {
  /** Asset criticality level - shared with Asset Inventory */
  CRITICALITY: 'asset.criticality',
  /** Platform: windows, macos, linux */
  PLATFORM: 'asset.platform',
  /** Asset category: 'endpoint' vs 'cloud_resource' */
  CATEGORY: 'asset.category',
} as const;

// =============================================================================
// ENDPOINT-SPECIFIC FIELDS (Your Domain Data)
// =============================================================================

export const ENDPOINT_FIELDS = {
  // Lifecycle
  FIRST_SEEN: 'endpoint.lifecycle.first_seen',
  LAST_SEEN: 'endpoint.lifecycle.last_seen',
  LAST_UPDATED: 'endpoint.lifecycle.last_updated',

  // Hardware
  CPU: 'endpoint.hardware.cpu',
  CPU_CORES: 'endpoint.hardware.cpu_cores',
  MEMORY_GB: 'endpoint.hardware.memory_gb',
  VENDOR: 'endpoint.hardware.vendor',
  MODEL: 'endpoint.hardware.model',

  // Network
  INTERFACES: 'endpoint.network.interfaces',
  LISTENING_PORTS_COUNT: 'endpoint.network.listening_ports_count',

  // Software
  INSTALLED_COUNT: 'endpoint.software.installed_count',
  SERVICES_COUNT: 'endpoint.software.services_count',

  // Posture
  POSTURE_SCORE: 'endpoint.posture.score',
  POSTURE_LEVEL: 'endpoint.posture.level',
  DISK_ENCRYPTION: 'endpoint.posture.disk_encryption',
  FIREWALL_ENABLED: 'endpoint.posture.firewall_enabled',
  SECURE_BOOT: 'endpoint.posture.secure_boot',
  CHECKS_PASSED: 'endpoint.posture.checks.passed',
  CHECKS_FAILED: 'endpoint.posture.checks.failed',
  CHECKS_TOTAL: 'endpoint.posture.checks.total',
  FAILED_CHECKS: 'endpoint.posture.failed_checks',

  // Privileges
  LOCAL_ADMINS: 'endpoint.privileges.local_admins',
  ADMIN_COUNT: 'endpoint.privileges.admin_count',
  ROOT_USERS: 'endpoint.privileges.root_users',
  ELEVATED_RISK: 'endpoint.privileges.elevated_risk',

  // Drift
  LAST_CHANGE: 'endpoint.drift.last_change',
  CHANGE_TYPES: 'endpoint.drift.change_types',
  RECENTLY_CHANGED: 'endpoint.drift.recently_changed',

  // Unknown Knowns - Dormant Risk Detection
  UK_SSH_KEYS_OVER_180D: 'endpoint.unknown_knowns.ssh_keys_over_180d',
  UK_DORMANT_USERS_30D: 'endpoint.unknown_knowns.dormant_users_30d',
  UK_DORMANT_USERS_LIST: 'endpoint.unknown_knowns.dormant_users_list',
  UK_EXTERNAL_TASKS_WINDOWS: 'endpoint.unknown_knowns.external_tasks_windows',
  UK_EXTERNAL_TASKS_LIST: 'endpoint.unknown_knowns.external_tasks_list',
  UK_EXTERNAL_CRON_JOBS: 'endpoint.unknown_knowns.external_cron_jobs',
  UK_EXTERNAL_LAUNCH_ITEMS: 'endpoint.unknown_knowns.external_launch_items',
  UK_TOTAL_DORMANT_RISKS: 'endpoint.unknown_knowns.total_dormant_risks',
  UK_RISK_LEVEL: 'endpoint.unknown_knowns.risk_level',
} as const;

// =============================================================================
// ENTITY TYPES & ENUMS
// =============================================================================

/** Entity types for Entity Store compatibility */
export const ENTITY_TYPE = {
  HOST: 'host',
} as const;

/** Entity sub-types to differentiate data sources */
export const ENTITY_SUB_TYPE = {
  /** Osquery-based endpoint assets */
  ENDPOINT: 'endpoint',
  /** Cloud VMs (for future integration) */
  CLOUD_HOST: 'cloud_host',
} as const;

/** Data source identifiers */
export const ENTITY_SOURCE = {
  /** Osquery-based asset discovery */
  OSQUERY: 'osquery',
  /** Cloud asset discovery integration */
  CLOUD_ASSET_DISCOVERY: 'cloud_asset_discovery',
} as const;

// =============================================================================
// POSTURE SCORING
// =============================================================================

/** Posture score thresholds for risk level determination */
export const POSTURE_SCORE_THRESHOLDS = {
  /** Score <= 49 = CRITICAL */
  CRITICAL: 49,
  /** Score 50-69 = HIGH */
  HIGH: 69,
  /** Score 70-89 = MEDIUM */
  MEDIUM: 89,
  /** Score 90-100 = LOW */
  LOW: 100,
} as const;

/** Posture deductions for security checks */
export const POSTURE_DEDUCTIONS = {
  DISK_ENCRYPTION_DISABLED: 25,
  FIREWALL_DISABLED: 20,
  SECURE_BOOT_DISABLED: 15,
  LOCAL_ADMINS_EXCESSIVE: 10,
  ELASTIC_AGENT_NOT_RUNNING: 20,
  ROOT_USER_DETECTED: 10,
} as const;

/** Posture status values */
export const POSTURE_STATUS = {
  OK: 'OK',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN',
} as const;

/** Posture risk levels */
export const POSTURE_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// =============================================================================
// ASSET CRITICALITY (From Asset Inventory)
// =============================================================================

/** Asset criticality levels - compatible with Asset Inventory */
export const ASSET_CRITICALITY_LEVELS = {
  LOW_IMPACT: 'low_impact',
  MEDIUM_IMPACT: 'medium_impact',
  HIGH_IMPACT: 'high_impact',
  EXTREME_IMPACT: 'extreme_impact',
} as const;

// =============================================================================
// API ROUTES
// =============================================================================

export const ENDPOINT_ASSETS_API_BASE = '/api/endpoint_assets';

export const ENDPOINT_ASSETS_ROUTES = {
  LIST: `${ENDPOINT_ASSETS_API_BASE}/list`,
  GET: `${ENDPOINT_ASSETS_API_BASE}/get/{assetId}`,
  POSTURE_SUMMARY: `${ENDPOINT_ASSETS_API_BASE}/posture/summary`,
  PRIVILEGES_SUMMARY: `${ENDPOINT_ASSETS_API_BASE}/privileges/summary`,
  DRIFT_SUMMARY: `${ENDPOINT_ASSETS_API_BASE}/drift/summary`,
  DRIFT_EVENTS: `${ENDPOINT_ASSETS_API_BASE}/drift/events`,
  UNKNOWN_KNOWNS_SUMMARY: `${ENDPOINT_ASSETS_API_BASE}/unknown_knowns/summary`,
  TRANSFORM_STATUS: `${ENDPOINT_ASSETS_API_BASE}/transform/status`,
  TRANSFORM_START: `${ENDPOINT_ASSETS_API_BASE}/transform/start`,
  TRANSFORM_STOP: `${ENDPOINT_ASSETS_API_BASE}/transform/stop`,
  /** List available Entity Store host snapshots */
  SNAPSHOT_LIST: `${ENDPOINT_ASSETS_API_BASE}/snapshot/list`,
  /** Compare two Entity Store host snapshots by date */
  SNAPSHOT_COMPARE: `${ENDPOINT_ASSETS_API_BASE}/snapshot/compare`,
  /** Get software inventory for a specific host */
  SOFTWARE_INVENTORY: `${ENDPOINT_ASSETS_API_BASE}/software/{host_id}`,
  /** Get aggregated software overview across all hosts */
  SOFTWARE_OVERVIEW: `${ENDPOINT_ASSETS_API_BASE}/software/overview`,
  /** Initialize software inventory transform */
  SOFTWARE_TRANSFORM_INIT: `${ENDPOINT_ASSETS_API_BASE}/software/transform/init`,
  /** Start software inventory transform */
  SOFTWARE_TRANSFORM_START: `${ENDPOINT_ASSETS_API_BASE}/software/transform/start`,
  /** Stop software inventory transform */
  SOFTWARE_TRANSFORM_STOP: `${ENDPOINT_ASSETS_API_BASE}/software/transform/stop`,
  /** Get software inventory transform status */
  SOFTWARE_TRANSFORM_STATUS: `${ENDPOINT_ASSETS_API_BASE}/software/transform/status`,
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const ENDPOINT_ASSETS_FEATURE_FLAG = 'endpointAssetVisibilityEnabled';

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const MAX_ASSETS_TO_LOAD = 500;
export const DEFAULT_VISIBLE_ROWS_PER_PAGE = 25;
export const DEFAULT_TABLE_SECTION_HEIGHT = 512;

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

const LOCAL_STORAGE_PREFIX = 'endpointAssets';

export const LOCAL_STORAGE_KEYS = {
  COLUMNS: `${LOCAL_STORAGE_PREFIX}:columns`,
  COLUMNS_SETTINGS: `${LOCAL_STORAGE_PREFIX}:columns:settings`,
  PAGE_SIZE: `${LOCAL_STORAGE_PREFIX}:pageSize`,
  GROUPING: `${LOCAL_STORAGE_PREFIX}:grouping`,
} as const;

// =============================================================================
// TEST SUBJECTS
// =============================================================================

export const TEST_SUBJECTS = {
  DATA_GRID: 'endpoint-assets-data-grid',
  PAGE_TITLE: 'endpoint-assets-page-title',
  POSTURE_OVERVIEW: 'endpoint-assets-posture-overview',
  ASSET_DETAIL_FLYOUT: 'endpoint-assets-detail-flyout',
  LOADING: 'endpoint-assets-loading',
} as const;

// =============================================================================
// GROUPING OPTIONS
// =============================================================================

export const ASSET_GROUPING_OPTIONS = {
  NONE: 'none',
  PLATFORM: ASSET_FIELDS.PLATFORM,
  POSTURE_LEVEL: ENDPOINT_FIELDS.POSTURE_LEVEL,
  CRITICALITY: ASSET_FIELDS.CRITICALITY,
} as const;

// =============================================================================
// DRIFT DETECTION CONFIGURATION
// =============================================================================

/** Drift events destination index */
export const DRIFT_EVENTS_INDEX_PATTERN = 'endpoint-drift-events-*';

/** Drift events destination index (specific) */
export const DRIFT_EVENTS_INDEX = 'endpoint-drift-events-default';

/** Drift transform ID */
export const DRIFT_TRANSFORM_ID = 'endpoint-drift-events-default';

/** Drift ingest pipeline ID */
export const DRIFT_INGEST_PIPELINE_ID = 'endpoint-drift-events-ingest-default';

/**
 * Drift categories - maps to action_id patterns in osquery pack queries
 * Query naming convention: drift_<category>_<query_name>
 * e.g., drift_network_listening_ports, drift_persistence_services
 */
export const DRIFT_CATEGORIES = {
  PRIVILEGES: 'privileges',
  PERSISTENCE: 'persistence',
  NETWORK: 'network',
  SOFTWARE: 'software',
  POSTURE: 'posture',
  /** Runtime processes - high privilege process monitoring */
  RUNTIME: 'runtime',
} as const;

/**
 * Drift severity levels assigned by category
 */
export const DRIFT_SEVERITY_BY_CATEGORY = {
  privileges: 'high',
  persistence: 'critical',
  network: 'medium',
  software: 'low',
  posture: 'high',
  runtime: 'medium',
} as const;

/**
 * Drift Transform Source Configuration
 *
 * This configuration is used to create the Elasticsearch transform that
 * processes osquery differential results into drift events.
 *
 * Key features:
 * - Filters out initial baseline (counter=0) to only capture actual changes
 * - Excludes monitoring agent noise (osqueryd, elastic-agent)
 * - Uses runtime mapping for deduplication within time windows
 */
export const DRIFT_TRANSFORM_SOURCE_CONFIG = {
  /** Source index for osquery results */
  index: ['logs-osquery_manager.result-default'],

  /** Query filter to select drift events */
  query: {
    bool: {
      must: [
        // Must have differential action metadata
        { exists: { field: 'osquery_meta.action' } },
        // Must have host identifier
        { exists: { field: 'host.id' } },
        // IMPORTANT: Exclude initial baseline snapshot (counter=0)
        // counter=0 is the first run that enumerates all existing items
        // counter>0 represents actual changes detected after baseline
        { range: { 'osquery_meta.counter': { gt: 0 } } },
      ],
      must_not: [
        // Exclude osquery monitoring agent from network queries
        { term: { 'osquery.process_name': 'osqueryd' } },
        { term: { 'osquery.process_name': 'elastic-agent' } },
        { wildcard: { 'osquery.process_path': '*osqueryd*' } },
        { wildcard: { 'osquery.process_path': '*elastic-agent*' } },
      ],
      should: [
        // Only process added/removed actions (differential mode)
        { term: { 'osquery_meta.action': 'added' } },
        { term: { 'osquery_meta.action': 'removed' } },
      ],
      minimum_should_match: 1,
      filter: [
        {
          bool: {
            should: [
              // Match all drift query categories by action_id pattern
              { wildcard: { action_id: '*drift_privileges*' } },
              { wildcard: { action_id: '*drift_persistence*' } },
              { wildcard: { action_id: '*drift_network*' } },
              { wildcard: { action_id: '*drift_software*' } },
              { wildcard: { action_id: '*drift_posture*' } },
              { wildcard: { action_id: '*drift_certificates*' } },
              { wildcard: { action_id: '*drift_hardware*' } },
              { wildcard: { action_id: '*drift_runtime*' } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  },

  /**
   * Runtime mapping for deduplication
   *
   * Creates a unique key per drift event to prevent duplicates
   * within the same time window (1-minute buckets).
   *
   * Key format: hostId_actionId_action_name_port_proto_minuteBucket
   */
  runtime_mappings: {
    drift_unique_key: {
      type: 'keyword' as const,
      script: {
        source: `
          def hostId = doc['host.id'].size() > 0 ? doc['host.id'].value : 'unknown';
          def action = doc['osquery_meta.action'].size() > 0 ? doc['osquery_meta.action'].value : 'unknown';
          def actionId = doc['action_id'].size() > 0 ? doc['action_id'].value : 'unknown';

          // Extract item name from various osquery fields
          def name = '';
          if (doc.containsKey('osquery.username') && doc['osquery.username'].size() > 0) {
            name = doc['osquery.username'].value;
          } else if (doc.containsKey('osquery.name') && doc['osquery.name'].size() > 0) {
            name = doc['osquery.name'].value;
          } else if (doc.containsKey('osquery.label') && doc['osquery.label'].size() > 0) {
            name = doc['osquery.label'].value;
          } else if (doc.containsKey('osquery.process_name') && doc['osquery.process_name'].size() > 0) {
            name = doc['osquery.process_name'].value;
          } else if (doc.containsKey('osquery.path') && doc['osquery.path'].size() > 0) {
            name = doc['osquery.path'].value;
          }

          // Network-specific fields for port/connection dedup
          def port = doc.containsKey('osquery.port') && doc['osquery.port'].size() > 0
            ? doc['osquery.port'].value : '';
          def proto = doc.containsKey('osquery.protocol') && doc['osquery.protocol'].size() > 0
            ? doc['osquery.protocol'].value : '';

          // Bucket by minute to deduplicate within time windows
          def ts = doc['@timestamp'].value.toInstant().toEpochMilli() / 60000;

          emit(hostId + '_' + actionId + '_' + action + '_' + name + '_' + port + '_' + proto + '_' + ts);
        `.replace(/\s+/g, ' ').trim(),
      },
    },
  },
} as const;

/**
 * Drift Ingest Pipeline Processors
 *
 * This pipeline enriches osquery differential results with:
 * - drift.category (privileges, persistence, network, software, posture, runtime)
 * - drift.severity (critical, high, medium, low)
 * - drift.action (added, removed)
 * - drift.item (type, name, value) - human-readable change description
 * - ECS event fields (event.kind, event.category, event.type, event.action)
 */
export const DRIFT_INGEST_PIPELINE_PROCESSORS = {
  /**
   * Category and severity assignment based on action_id
   *
   * Parses the action_id to determine which drift category
   * the event belongs to and assigns appropriate severity.
   */
  categoryProcessor: {
    script: {
      lang: 'painless',
      description: 'Set drift category and severity based on action_id',
      source: `
        def actionId = ctx.action_id;
        if (actionId == null) { return; }
        if (ctx.drift == null) { ctx.drift = new HashMap(); }

        if (actionId.contains('drift_privileges')) {
          ctx.drift.category = 'privileges';
          ctx.drift.severity = 'high';
        } else if (actionId.contains('drift_persistence')) {
          ctx.drift.category = 'persistence';
          ctx.drift.severity = 'critical';
        } else if (actionId.contains('drift_network')) {
          ctx.drift.category = 'network';
          ctx.drift.severity = 'medium';
        } else if (actionId.contains('drift_software')) {
          ctx.drift.category = 'software';
          ctx.drift.severity = 'low';
        } else if (actionId.contains('drift_posture')) {
          ctx.drift.category = 'posture';
          ctx.drift.severity = 'high';
        } else if (actionId.contains('drift_certificates')) {
          ctx.drift.category = 'posture';
          ctx.drift.severity = 'high';
        } else if (actionId.contains('drift_hardware')) {
          ctx.drift.category = 'posture';
          ctx.drift.severity = 'medium';
        } else if (actionId.contains('drift_runtime')) {
          ctx.drift.category = 'runtime';
          ctx.drift.severity = 'medium';
        } else {
          ctx.drift.category = 'unknown';
          ctx.drift.severity = 'low';
        }

        ctx.drift.query_id = actionId;
        ctx.drift.query_name = actionId;
      `.replace(/\s+/g, ' ').trim(),
    },
  },

  /**
   * Item extraction processor
   *
   * Extracts human-readable drift item details from osquery fields.
   * Different categories have different relevant fields:
   * - privileges: username, groupname, path (ssh keys)
   * - persistence: name (services), id (systemd), label (launchd), command (cron)
   * - network: process_name + port + protocol, remote_address
   * - software: name + version, identifier (extensions)
   * - posture: name + current_value, common_name (certs), vendor + model (usb)
   * - runtime: name (process), path (file)
   */
  itemProcessor: {
    script: {
      lang: 'painless',
      description: 'Extract drift item details with rich connection info',
      source: `
        if (ctx.drift == null) { ctx.drift = new HashMap(); }
        if (ctx.drift.item == null) { ctx.drift.item = new HashMap(); }

        def o = ctx.osquery;
        if (o == null) {
          ctx.drift.item.type = 'unknown';
          ctx.drift.item.name = 'no_data';
          return;
        }

        def cat = ctx.drift.category;

        if (cat == 'privileges') {
          if (o.containsKey('username')) {
            ctx.drift.item.type = 'user';
            ctx.drift.item.name = o.username;
            if (o.containsKey('groupname')) { ctx.drift.item.value = o.groupname; }
          } else if (o.containsKey('header')) {
            ctx.drift.item.type = 'sudoers';
            ctx.drift.item.name = o.header;
          } else if (o.containsKey('groupname')) {
            ctx.drift.item.type = 'group';
            ctx.drift.item.name = o.groupname;
          } else if (o.containsKey('path')) {
            ctx.drift.item.type = 'ssh_key';
            ctx.drift.item.name = o.path;
          } else {
            ctx.drift.item.type = 'privilege';
            ctx.drift.item.name = o.containsKey('name') ? o.name : 'change';
          }
        } else if (cat == 'persistence') {
          if (o.containsKey('name')) {
            ctx.drift.item.type = 'service';
            ctx.drift.item.name = o.name;
          } else if (o.containsKey('id')) {
            ctx.drift.item.type = 'systemd';
            ctx.drift.item.name = o.id;
          } else if (o.containsKey('command')) {
            ctx.drift.item.type = 'cron';
            ctx.drift.item.name = o.containsKey('path') ? o.path : o.command;
          } else if (o.containsKey('label')) {
            ctx.drift.item.type = 'launchd';
            ctx.drift.item.name = o.label;
          } else if (o.containsKey('path')) {
            ctx.drift.item.type = 'startup';
            ctx.drift.item.name = o.path;
          } else {
            ctx.drift.item.type = 'persistence';
            ctx.drift.item.name = 'change';
          }
        } else if (cat == 'network') {
          // Translate numeric protocol to name
          def proto = o.containsKey('protocol')
            ? (o.protocol == '6' ? 'tcp' : (o.protocol == '17' ? 'udp' : o.protocol))
            : '';

          if (o.containsKey('process_name') && o.containsKey('port') && o.port != '0') {
            // Listening port: "process:port/proto"
            ctx.drift.item.type = 'port';
            ctx.drift.item.name = o.process_name + ':' + o.port + '/' + proto;
            if (o.containsKey('remote_address')) {
              ctx.drift.item.value = o.remote_address + ':' + o.remote_port;
            }
          } else if (o.containsKey('process_name') && o.containsKey('local_port')) {
            // Active connection: "process -> remote:port"
            ctx.drift.item.type = 'connection';
            ctx.drift.item.name = o.process_name + ' -> '
              + (o.containsKey('remote_address') ? o.remote_address : '') + ':'
              + (o.containsKey('remote_port') ? o.remote_port : '');
            ctx.drift.item.value = o.local_port + '/' + proto;
          } else if (o.containsKey('destination')) {
            ctx.drift.item.type = 'route';
            ctx.drift.item.name = o.destination;
            if (o.containsKey('gateway')) { ctx.drift.item.value = 'via ' + o.gateway; }
          } else if (o.containsKey('address')) {
            ctx.drift.item.type = 'host';
            ctx.drift.item.name = o.address;
          } else if (o.containsKey('process_name')) {
            ctx.drift.item.type = 'network';
            ctx.drift.item.name = o.process_name;
          } else {
            ctx.drift.item.type = 'network';
            ctx.drift.item.name = o.containsKey('name') ? o.name : 'change';
          }
        } else if (cat == 'software') {
          if (o.containsKey('name')) {
            ctx.drift.item.type = 'software';
            ctx.drift.item.name = o.name;
            if (o.containsKey('version')) { ctx.drift.item.value = o.version; }
          } else if (o.containsKey('identifier')) {
            ctx.drift.item.type = 'extension';
            ctx.drift.item.name = o.containsKey('name') ? o.name : o.identifier;
          } else if (o.containsKey('path')) {
            ctx.drift.item.type = 'app';
            ctx.drift.item.name = o.path;
          } else {
            ctx.drift.item.type = 'software';
            ctx.drift.item.name = 'change';
          }
        } else if (cat == 'posture') {
          if (o.containsKey('name')) {
            ctx.drift.item.type = 'config';
            ctx.drift.item.name = o.name;
            if (o.containsKey('current_value')) { ctx.drift.item.value = o.current_value; }
          } else if (o.containsKey('common_name')) {
            ctx.drift.item.type = 'certificate';
            ctx.drift.item.name = o.common_name;
          } else if (o.containsKey('vendor')) {
            ctx.drift.item.type = 'usb';
            ctx.drift.item.name = o.vendor + ' ' + (o.containsKey('model') ? o.model : '');
          } else if (o.containsKey('path')) {
            ctx.drift.item.type = 'config';
            ctx.drift.item.name = o.path;
          } else {
            ctx.drift.item.type = 'posture';
            ctx.drift.item.name = 'change';
          }
        } else if (cat == 'runtime') {
          if (o.containsKey('name')) {
            ctx.drift.item.type = 'process';
            ctx.drift.item.name = o.name;
          } else if (o.containsKey('path')) {
            ctx.drift.item.type = 'file';
            ctx.drift.item.name = o.path;
          } else {
            ctx.drift.item.type = 'runtime';
            ctx.drift.item.name = 'change';
          }
        } else {
          ctx.drift.item.type = 'unknown';
          ctx.drift.item.name = o.containsKey('name') ? o.name : 'change';
        }
      `.replace(/\s+/g, ' ').trim(),
    },
  },

  /** Copy osquery_meta.action to drift.action */
  actionProcessor: {
    set: {
      field: 'drift.action',
      copy_from: 'osquery_meta.action',
      ignore_empty_value: true,
    },
  },

  /** ECS event.kind */
  eventKindProcessor: {
    set: {
      field: 'event.kind',
      value: 'event',
    },
  },

  /** ECS event.category */
  eventCategoryProcessor: {
    set: {
      field: 'event.category',
      value: ['configuration'],
    },
  },

  /** ECS event.type */
  eventTypeProcessor: {
    set: {
      field: 'event.type',
      value: ['change'],
    },
  },

  /** ECS event.action from drift.action */
  eventActionProcessor: {
    set: {
      field: 'event.action',
      copy_from: 'drift.action',
      ignore_empty_value: true,
    },
  },
} as const;

/**
 * Drift Transform Destination Configuration
 */
export const DRIFT_TRANSFORM_DEST_CONFIG = {
  /** Destination index for drift events */
  index: DRIFT_EVENTS_INDEX,
  /** Ingest pipeline to enrich documents */
  pipeline: DRIFT_INGEST_PIPELINE_ID,
} as const;

/**
 * Drift Transform Sync Configuration
 */
export const DRIFT_TRANSFORM_SYNC_CONFIG = {
  time: {
    /** Field to use for sync checkpoint */
    field: '@timestamp',
    /** Delay before processing (allows late-arriving data) */
    delay: '1m',
  },
} as const;

/**
 * Helper: Get the full transform definition
 */
export const getDriftTransformDefinition = () => ({
  id: DRIFT_TRANSFORM_ID,
  source: DRIFT_TRANSFORM_SOURCE_CONFIG,
  dest: DRIFT_TRANSFORM_DEST_CONFIG,
  sync: DRIFT_TRANSFORM_SYNC_CONFIG,
  frequency: '1m',
  settings: {
    max_page_search_size: 500,
  },
  latest: {
    unique_key: ['drift_unique_key'],
    sort: '@timestamp',
  },
});

/**
 * Helper: Get the full ingest pipeline definition
 */
export const getDriftIngestPipelineDefinition = () => ({
  description: 'Enrich osquery differential results with drift metadata',
  processors: [
    { script: DRIFT_INGEST_PIPELINE_PROCESSORS.categoryProcessor.script },
    DRIFT_INGEST_PIPELINE_PROCESSORS.actionProcessor,
    { script: DRIFT_INGEST_PIPELINE_PROCESSORS.itemProcessor.script },
    DRIFT_INGEST_PIPELINE_PROCESSORS.eventKindProcessor,
    DRIFT_INGEST_PIPELINE_PROCESSORS.eventCategoryProcessor,
    DRIFT_INGEST_PIPELINE_PROCESSORS.eventTypeProcessor,
    DRIFT_INGEST_PIPELINE_PROCESSORS.eventActionProcessor,
  ],
});

/**
 * Drift Events Index Mapping (auto-generated by transform, documented for reference)
 *
 * Key fields:
 * - drift.category (keyword) - privileges, persistence, network, software, posture, runtime
 * - drift.severity (keyword) - critical, high, medium, low
 * - drift.action (keyword) - added, removed
 * - drift.item.type (keyword) - user, service, port, software, etc.
 * - drift.item.name (keyword) - human-readable name of changed item
 * - drift.item.value (keyword) - additional context (version, remote address, etc.)
 * - drift.query_id (keyword) - full action_id from osquery pack
 * - drift.query_name (keyword) - human-readable query name
 * - host.id (keyword) - host identifier
 * - host.name (keyword) - hostname
 * - host.os.platform (keyword) - darwin, windows, linux, ubuntu, etc.
 * - osquery_meta.counter (long) - differential query run counter (0=baseline, >0=changes)
 * - osquery_meta.action (keyword) - added or removed
 */
export const DRIFT_EVENTS_INDEX_MAPPING_REFERENCE = {
  drift: {
    category: 'keyword',
    severity: 'keyword',
    action: 'keyword',
    query_id: 'keyword',
    query_name: 'keyword',
    item: {
      type: 'keyword',
      name: 'keyword',
      value: 'keyword',
    },
  },
  host: {
    id: 'keyword',
    name: 'keyword',
    os: {
      platform: 'keyword',
    },
  },
  osquery_meta: {
    counter: 'long',
    action: 'keyword',
  },
} as const;

// =============================================================================
// ENDPOINT ASSETS TRANSFORM & PIPELINE CONFIGURATION
// =============================================================================

/**
 * Endpoint Asset Facts Transform Configuration
 *
 * This transform aggregates osquery pack results into endpoint asset facts.
 * It runs continuously, pivoting by host.id to create a single document per host
 * with all asset visibility data consolidated.
 *
 * Transform ID: endpoint_asset_facts_{namespace}
 * Source: logs-osquery_manager.result-{namespace}
 * Destination: endpoint-assets-osquery-{namespace}
 */

/** Endpoint assets destination index (specific) */
export const ENDPOINT_ASSETS_INDEX = 'endpoint-assets-osquery-default';

/** Endpoint assets transform ID */
export const ENDPOINT_ASSETS_TRANSFORM_ID = 'endpoint_asset_facts_default';

/** Endpoint assets ingest pipeline ID */
export const ENDPOINT_ASSETS_INGEST_PIPELINE_ID = 'endpoint-assets-ingest-default';

/**
 * Endpoint Assets Transform Source Configuration
 *
 * Key features:
 * - Filters to only Asset pack queries (action_id contains "Asset")
 * - Uses runtime mappings to extract/normalize osquery field values
 * - Groups by host.id for per-host aggregation
 */
export const ENDPOINT_ASSETS_TRANSFORM_SOURCE_CONFIG = {
  /** Source index for osquery results */
  index: ['logs-osquery_manager.result-default'],

  /** Query filter to select asset-related queries */
  query: {
    bool: {
      must: [
        { wildcard: { action_id: '*Asset*' } },
      ],
    },
  },

  /**
   * Runtime mappings for field normalization
   *
   * These normalize osquery result fields into consistent values
   * that can be aggregated across different query types.
   */
  runtime_mappings: {
    // Hardware fields
    tmp_cpu_brand: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.cpu_brand') && doc['osquery.cpu_brand'].size() > 0 ? doc['osquery.cpu_brand'].value : null)",
      },
    },
    tmp_cpu_physical_cores: {
      type: 'long' as const,
      script: {
        source: "emit(doc.containsKey('osquery.cpu_physical_cores') && doc['osquery.cpu_physical_cores'].size() > 0 ? Long.parseLong(doc['osquery.cpu_physical_cores'].value) : 0)",
      },
    },
    tmp_memory_gb: {
      type: 'double' as const,
      script: {
        source: "emit(doc.containsKey('osquery.physical_memory') && doc['osquery.physical_memory'].size() > 0 ? Long.parseLong(doc['osquery.physical_memory'].value) / 1073741824.0 : 0.0)",
      },
    },
    tmp_hardware_vendor: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.hardware_vendor') && doc['osquery.hardware_vendor'].size() > 0 ? doc['osquery.hardware_vendor'].value : null)",
      },
    },
    tmp_hardware_model: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.hardware_model') && doc['osquery.hardware_model'].size() > 0 ? doc['osquery.hardware_model'].value : null)",
      },
    },
    tmp_hardware_serial: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.hardware_serial') && doc['osquery.hardware_serial'].size() > 0 ? doc['osquery.hardware_serial'].value : null)",
      },
    },

    // Posture check fields (boolean 0/1 from osquery)
    tmp_disk_encryption: {
      type: 'boolean' as const,
      script: {
        source: "emit(doc.containsKey('osquery.encrypted') && doc['osquery.encrypted'].size() > 0 && doc['osquery.encrypted'].value == '1')",
      },
    },
    tmp_firewall_enabled: {
      type: 'boolean' as const,
      script: {
        source: "emit(doc.containsKey('osquery.global_state') && doc['osquery.global_state'].size() > 0 && doc['osquery.global_state'].value == '1')",
      },
    },
    tmp_secure_boot: {
      type: 'boolean' as const,
      script: {
        source: "emit(doc.containsKey('osquery.secure_boot') && doc['osquery.secure_boot'].size() > 0 && doc['osquery.secure_boot'].value == '1')",
      },
    },
    tmp_sip_enabled: {
      type: 'boolean' as const,
      script: {
        source: "emit(doc.containsKey('osquery.config_flag') && doc['osquery.config_flag'].size() > 0 && doc['osquery.config_flag'].value.contains('sip'))",
      },
    },
    tmp_gatekeeper_enabled: {
      type: 'boolean' as const,
      script: {
        source: "emit(doc.containsKey('osquery.assessments_enabled') && doc['osquery.assessments_enabled'].size() > 0 && doc['osquery.assessments_enabled'].value == '1')",
      },
    },

    // Software fields
    tmp_software_name: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.name') && doc['osquery.name'].size() > 0 ? doc['osquery.name'].value : null)",
      },
    },
    tmp_software_version: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.version') && doc['osquery.version'].size() > 0 ? doc['osquery.version'].value : null)",
      },
    },

    // Privilege fields
    tmp_admin_username: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.username') && doc['osquery.username'].size() > 0 ? doc['osquery.username'].value : null)",
      },
    },

    // Network fields
    tmp_port: {
      type: 'long' as const,
      script: {
        source: "emit(doc.containsKey('osquery.port') && doc['osquery.port'].size() > 0 ? Long.parseLong(doc['osquery.port'].value) : 0)",
      },
    },

    // Unknown knowns fields
    tmp_dormant_user: {
      type: 'keyword' as const,
      script: {
        source: "emit(doc.containsKey('osquery.username') && doc['osquery.username'].size() > 0 ? doc['osquery.username'].value : null)",
      },
    },
    tmp_ssh_key_age_days: {
      type: 'long' as const,
      script: {
        source: "emit(doc.containsKey('osquery.age_days') && doc['osquery.age_days'].size() > 0 ? Long.parseLong(doc['osquery.age_days'].value) : 0)",
      },
    },
  },
} as const;

/**
 * Endpoint Assets Transform Pivot Configuration
 *
 * Groups by host.id and aggregates all asset data into a single document.
 * Uses filter aggregations to count items from specific query types.
 */
export const ENDPOINT_ASSETS_TRANSFORM_PIVOT_CONFIG = {
  /** Group by host identifier */
  group_by: {
    'host.id': { terms: { field: 'host.id' } },
    'host.name': { terms: { field: 'host.name' } },
    'host.os.platform': { terms: { field: 'host.os.platform' } },
  },

  /** Aggregations for each asset category */
  aggregations: {
    // Lifecycle timestamps
    '@timestamp': { max: { field: '@timestamp' } },
    'endpoint.lifecycle.first_seen': { min: { field: '@timestamp' } },
    'endpoint.lifecycle.last_seen': { max: { field: '@timestamp' } },

    // Hardware (first non-null value)
    'tmp_cpu_brand': { terms: { field: 'tmp_cpu_brand', size: 1, missing: 'unknown' } },
    'tmp_cpu_physical_cores': { max: { field: 'tmp_cpu_physical_cores' } },
    'tmp_memory_gb': { max: { field: 'tmp_memory_gb' } },
    'tmp_hardware_vendor': { terms: { field: 'tmp_hardware_vendor', size: 1, missing: 'unknown' } },
    'tmp_hardware_model': { terms: { field: 'tmp_hardware_model', size: 1, missing: 'unknown' } },
    'tmp_hardware_serial': { terms: { field: 'tmp_hardware_serial', size: 1, missing: 'unknown' } },

    // Posture checks (any true value = enabled)
    'tmp_disk_encryption': { filter: { term: { tmp_disk_encryption: true } } },
    'tmp_firewall_enabled': { filter: { term: { tmp_firewall_enabled: true } } },
    'tmp_secure_boot': { filter: { term: { tmp_secure_boot: true } } },
    'tmp_sip_enabled': { filter: { term: { tmp_sip_enabled: true } } },
    'tmp_gatekeeper_enabled': { filter: { term: { tmp_gatekeeper_enabled: true } } },

    // Software counts (by query type)
    'tmp_installed_packages': {
      filter: {
        bool: {
          should: [
            { wildcard: { action_id: '*installed_packages*' } },
            { wildcard: { action_id: '*installed_apps*' } },
            { wildcard: { action_id: '*programs*' } },
            { wildcard: { action_id: '*homebrew*' } },
          ],
          minimum_should_match: 1,
        },
      },
    },
    'tmp_services_count': {
      filter: {
        bool: {
          should: [
            { wildcard: { action_id: '*services*' } },
            { wildcard: { action_id: '*launchd*' } },
            { wildcard: { action_id: '*systemd*' } },
          ],
          minimum_should_match: 1,
        },
      },
    },

    // Privilege counts
    'tmp_admin_count': {
      filter: {
        bool: {
          should: [
            { wildcard: { action_id: '*admin_users*' } },
            { wildcard: { action_id: '*local_admins*' } },
            { wildcard: { action_id: '*sudoers*' } },
          ],
          minimum_should_match: 1,
        },
      },
    },
    'tmp_local_admins': {
      terms: { field: 'tmp_admin_username', size: 100, missing: '__none__' },
    },

    // Network counts
    'tmp_listening_ports_count': {
      filter: { wildcard: { action_id: '*listening_ports*' } },
    },

    // Unknown knowns
    'tmp_dormant_users_count': {
      filter: { wildcard: { action_id: '*dormant_users*' } },
    },
    'tmp_dormant_users_list': {
      terms: { field: 'tmp_dormant_user', size: 100, missing: '__none__' },
    },
    'tmp_old_ssh_keys_count': {
      filter: {
        bool: {
          must: [
            { wildcard: { action_id: '*ssh_keys*' } },
            { range: { tmp_ssh_key_age_days: { gte: 180 } } },
          ],
        },
      },
    },
    'tmp_external_cron_count': {
      filter: { wildcard: { action_id: '*external_cron*' } },
    },
    'tmp_external_launchd_count': {
      filter: { wildcard: { action_id: '*external_launchd*' } },
    },
    'tmp_external_tasks_count': {
      filter: { wildcard: { action_id: '*external_tasks*' } },
    },
  },
} as const;

/**
 * Endpoint Assets Ingest Pipeline Processors
 *
 * This pipeline flattens the transform's tmp_ fields into proper ECS paths
 * and calculates the posture score based on security checks.
 */
export const ENDPOINT_ASSETS_INGEST_PIPELINE_PROCESSORS = {
  /**
   * Main processor: Flatten fields and calculate posture score
   *
   * Takes the tmp_ aggregation buckets and extracts:
   * - First value from terms aggregations (hardware fields)
   * - Doc counts from filter aggregations (counts)
   * - Calculates posture score: 100 - deductions for failed checks
   */
  mainProcessor: {
    script: {
      lang: 'painless',
      description: 'Flatten tmp_ fields and calculate posture score',
      source: `
        // Initialize nested structures
        if (ctx.endpoint == null) { ctx.endpoint = new HashMap(); }
        if (ctx.endpoint.hardware == null) { ctx.endpoint.hardware = new HashMap(); }
        if (ctx.endpoint.posture == null) { ctx.endpoint.posture = new HashMap(); }
        if (ctx.endpoint.posture.checks == null) { ctx.endpoint.posture.checks = new HashMap(); }
        if (ctx.endpoint.privileges == null) { ctx.endpoint.privileges = new HashMap(); }
        if (ctx.endpoint.software == null) { ctx.endpoint.software = new HashMap(); }
        if (ctx.endpoint.network == null) { ctx.endpoint.network = new HashMap(); }
        if (ctx.endpoint.unknown_knowns == null) { ctx.endpoint.unknown_knowns = new HashMap(); }
        if (ctx.entity == null) { ctx.entity = new HashMap(); }

        // Helper: Extract first bucket key from terms aggregation
        def getFirstBucketKey = (agg) -> {
          if (agg == null) return null;
          def buckets = agg.buckets;
          if (buckets == null || buckets.size() == 0) return null;
          def key = buckets[0].key;
          return (key == 'unknown' || key == '__none__') ? null : key;
        };

        // Helper: Get doc_count from filter aggregation
        def getDocCount = (agg) -> {
          return agg != null && agg.doc_count != null ? agg.doc_count : 0;
        };

        // Hardware fields (from terms aggregations)
        ctx.endpoint.hardware.cpu = getFirstBucketKey(ctx.tmp_cpu_brand);
        ctx.endpoint.hardware.cpu_cores = ctx.tmp_cpu_physical_cores != null
          ? ctx.tmp_cpu_physical_cores.value : 0;
        ctx.endpoint.hardware.memory_gb = ctx.tmp_memory_gb != null
          ? Math.round(ctx.tmp_memory_gb.value * 10) / 10.0 : 0;
        ctx.endpoint.hardware.vendor = getFirstBucketKey(ctx.tmp_hardware_vendor);
        ctx.endpoint.hardware.model = getFirstBucketKey(ctx.tmp_hardware_model);
        ctx.endpoint.hardware.serial = getFirstBucketKey(ctx.tmp_hardware_serial);

        // Posture checks (from filter aggregation doc_counts > 0)
        def diskEnc = getDocCount(ctx.tmp_disk_encryption) > 0;
        def firewall = getDocCount(ctx.tmp_firewall_enabled) > 0;
        def secureBoot = getDocCount(ctx.tmp_secure_boot) > 0;
        def sip = getDocCount(ctx.tmp_sip_enabled) > 0;
        def gatekeeper = getDocCount(ctx.tmp_gatekeeper_enabled) > 0;

        ctx.endpoint.posture.disk_encryption = diskEnc;
        ctx.endpoint.posture.firewall_enabled = firewall;
        ctx.endpoint.posture.secure_boot = secureBoot;

        // Calculate posture score
        int score = 100;
        int passed = 0;
        int failed = 0;
        def failedChecks = new ArrayList();

        // Disk encryption check (25 points)
        if (diskEnc) { passed++; }
        else { failed++; score -= 25; failedChecks.add('disk_encryption'); }

        // Firewall check (20 points)
        if (firewall) { passed++; }
        else { failed++; score -= 20; failedChecks.add('firewall'); }

        // Secure boot check (15 points) - skip on macOS
        def platform = ctx.host != null && ctx.host.os != null ? ctx.host.os.platform : '';
        if (platform != 'darwin') {
          if (secureBoot) { passed++; }
          else { failed++; score -= 15; failedChecks.add('secure_boot'); }
        }

        ctx.endpoint.posture.score = Math.max(0, score);
        ctx.endpoint.posture.checks.passed = passed;
        ctx.endpoint.posture.checks.failed = failed;
        ctx.endpoint.posture.checks.total = passed + failed;
        ctx.endpoint.posture.failed_checks = failedChecks;

        // Posture level based on score
        if (score >= 90) { ctx.endpoint.posture.level = 'LOW'; }
        else if (score >= 70) { ctx.endpoint.posture.level = 'MEDIUM'; }
        else if (score >= 50) { ctx.endpoint.posture.level = 'HIGH'; }
        else { ctx.endpoint.posture.level = 'CRITICAL'; }

        // Software counts
        ctx.endpoint.software.installed_count = getDocCount(ctx.tmp_installed_packages);
        ctx.endpoint.software.services_count = getDocCount(ctx.tmp_services_count);

        // Privilege data
        ctx.endpoint.privileges.admin_count = getDocCount(ctx.tmp_admin_count);
        def adminBuckets = ctx.tmp_local_admins != null ? ctx.tmp_local_admins.buckets : null;
        if (adminBuckets != null && adminBuckets.size() > 0) {
          def admins = new ArrayList();
          for (def bucket : adminBuckets) {
            if (bucket.key != '__none__') { admins.add(bucket.key); }
          }
          ctx.endpoint.privileges.local_admins = admins;
        }
        ctx.endpoint.privileges.elevated_risk = ctx.endpoint.privileges.admin_count > 3;

        // Network
        ctx.endpoint.network.listening_ports_count = getDocCount(ctx.tmp_listening_ports_count);

        // Unknown knowns
        ctx.endpoint.unknown_knowns.ssh_keys_over_180d = getDocCount(ctx.tmp_old_ssh_keys_count);
        ctx.endpoint.unknown_knowns.dormant_users_30d = getDocCount(ctx.tmp_dormant_users_count);
        def dormantBuckets = ctx.tmp_dormant_users_list != null ? ctx.tmp_dormant_users_list.buckets : null;
        if (dormantBuckets != null && dormantBuckets.size() > 0) {
          def users = new ArrayList();
          for (def bucket : dormantBuckets) {
            if (bucket.key != '__none__') { users.add(bucket.key); }
          }
          ctx.endpoint.unknown_knowns.dormant_users_list = users;
        }
        ctx.endpoint.unknown_knowns.external_cron_jobs = getDocCount(ctx.tmp_external_cron_count);
        ctx.endpoint.unknown_knowns.external_launch_items = getDocCount(ctx.tmp_external_launchd_count);
        ctx.endpoint.unknown_knowns.external_tasks_windows = getDocCount(ctx.tmp_external_tasks_count);

        // Total dormant risks
        ctx.endpoint.unknown_knowns.total_dormant_risks =
          ctx.endpoint.unknown_knowns.ssh_keys_over_180d +
          ctx.endpoint.unknown_knowns.dormant_users_30d +
          ctx.endpoint.unknown_knowns.external_cron_jobs +
          ctx.endpoint.unknown_knowns.external_launch_items +
          ctx.endpoint.unknown_knowns.external_tasks_windows;

        // Unknown knowns risk level
        int ukTotal = ctx.endpoint.unknown_knowns.total_dormant_risks;
        if (ukTotal == 0) { ctx.endpoint.unknown_knowns.risk_level = 'LOW'; }
        else if (ukTotal <= 2) { ctx.endpoint.unknown_knowns.risk_level = 'MEDIUM'; }
        else if (ukTotal <= 5) { ctx.endpoint.unknown_knowns.risk_level = 'HIGH'; }
        else { ctx.endpoint.unknown_knowns.risk_level = 'CRITICAL'; }

        // Entity fields (for Entity Store compatibility)
        ctx.entity.type = 'host';
        ctx.entity.sub_type = 'endpoint';
        ctx.entity.source = 'osquery';
        if (ctx.host != null && ctx.host.id != null) {
          ctx.entity.id = ctx.host.id;
        }
        if (ctx.host != null && ctx.host.name != null) {
          ctx.entity.name = ctx.host.name;
        }

        // Asset fields
        if (ctx.asset == null) { ctx.asset = new HashMap(); }
        ctx.asset.category = 'endpoint';
        if (ctx.host != null && ctx.host.os != null && ctx.host.os.platform != null) {
          ctx.asset.platform = ctx.host.os.platform;
        }
      `.replace(/\s+/g, ' ').trim(),
    },
  },

  /**
   * Cleanup processor: Remove temporary fields
   *
   * Removes all tmp_* fields after they've been processed.
   */
  cleanupProcessor: {
    remove: {
      field: [
        'tmp_cpu_brand',
        'tmp_cpu_physical_cores',
        'tmp_memory_gb',
        'tmp_hardware_vendor',
        'tmp_hardware_model',
        'tmp_hardware_serial',
        'tmp_disk_encryption',
        'tmp_firewall_enabled',
        'tmp_secure_boot',
        'tmp_sip_enabled',
        'tmp_gatekeeper_enabled',
        'tmp_installed_packages',
        'tmp_services_count',
        'tmp_admin_count',
        'tmp_local_admins',
        'tmp_listening_ports_count',
        'tmp_dormant_users_count',
        'tmp_dormant_users_list',
        'tmp_old_ssh_keys_count',
        'tmp_external_cron_count',
        'tmp_external_launchd_count',
        'tmp_external_tasks_count',
      ],
      ignore_missing: true,
    },
  },
} as const;

/**
 * Endpoint Assets Transform Destination Configuration
 */
export const ENDPOINT_ASSETS_TRANSFORM_DEST_CONFIG = {
  /** Destination index for endpoint assets */
  index: ENDPOINT_ASSETS_INDEX,
  /** Ingest pipeline to process documents */
  pipeline: ENDPOINT_ASSETS_INGEST_PIPELINE_ID,
} as const;

/**
 * Endpoint Assets Transform Sync Configuration
 */
export const ENDPOINT_ASSETS_TRANSFORM_SYNC_CONFIG = {
  time: {
    /** Field to use for sync checkpoint */
    field: '@timestamp',
    /** Delay before processing (allows late-arriving data) */
    delay: '1m',
  },
} as const;

/**
 * Helper: Get the full endpoint assets transform definition
 */
export const getEndpointAssetsTransformDefinition = () => ({
  id: ENDPOINT_ASSETS_TRANSFORM_ID,
  source: ENDPOINT_ASSETS_TRANSFORM_SOURCE_CONFIG,
  dest: ENDPOINT_ASSETS_TRANSFORM_DEST_CONFIG,
  sync: ENDPOINT_ASSETS_TRANSFORM_SYNC_CONFIG,
  frequency: '5m',
  pivot: ENDPOINT_ASSETS_TRANSFORM_PIVOT_CONFIG,
  settings: {
    max_page_search_size: 500,
  },
});

/**
 * Helper: Get the full endpoint assets ingest pipeline definition
 */
export const getEndpointAssetsIngestPipelineDefinition = () => ({
  description: 'Process endpoint asset facts from osquery transform output',
  processors: [
    { script: ENDPOINT_ASSETS_INGEST_PIPELINE_PROCESSORS.mainProcessor.script },
    ENDPOINT_ASSETS_INGEST_PIPELINE_PROCESSORS.cleanupProcessor,
  ],
});

/**
 * Endpoint Assets Index Mapping Reference
 *
 * Key fields in the endpoint-assets-osquery-* index:
 *
 * Entity fields (Entity Store compatible):
 * - entity.id (keyword) - host identifier
 * - entity.name (keyword) - hostname
 * - entity.type (keyword) - always "host"
 * - entity.sub_type (keyword) - "endpoint"
 * - entity.source (keyword) - "osquery"
 *
 * Asset fields:
 * - asset.category (keyword) - "endpoint"
 * - asset.platform (keyword) - darwin, windows, linux
 *
 * Hardware fields:
 * - endpoint.hardware.cpu (keyword) - CPU brand
 * - endpoint.hardware.cpu_cores (long) - physical core count
 * - endpoint.hardware.memory_gb (double) - RAM in GB
 * - endpoint.hardware.vendor (keyword) - hardware vendor
 * - endpoint.hardware.model (keyword) - hardware model
 * - endpoint.hardware.serial (keyword) - serial number
 *
 * Posture fields:
 * - endpoint.posture.score (integer) - 0-100 security score
 * - endpoint.posture.level (keyword) - LOW, MEDIUM, HIGH, CRITICAL
 * - endpoint.posture.disk_encryption (boolean)
 * - endpoint.posture.firewall_enabled (boolean)
 * - endpoint.posture.secure_boot (boolean)
 * - endpoint.posture.checks.passed (integer)
 * - endpoint.posture.checks.failed (integer)
 * - endpoint.posture.checks.total (integer)
 * - endpoint.posture.failed_checks (keyword[])
 *
 * Privileges fields:
 * - endpoint.privileges.admin_count (integer)
 * - endpoint.privileges.local_admins (keyword[])
 * - endpoint.privileges.elevated_risk (boolean)
 *
 * Software fields:
 * - endpoint.software.installed_count (integer)
 * - endpoint.software.services_count (integer)
 *
 * Network fields:
 * - endpoint.network.listening_ports_count (integer)
 *
 * Unknown knowns fields:
 * - endpoint.unknown_knowns.ssh_keys_over_180d (integer)
 * - endpoint.unknown_knowns.dormant_users_30d (integer)
 * - endpoint.unknown_knowns.dormant_users_list (keyword[])
 * - endpoint.unknown_knowns.external_cron_jobs (integer)
 * - endpoint.unknown_knowns.external_launch_items (integer)
 * - endpoint.unknown_knowns.external_tasks_windows (integer)
 * - endpoint.unknown_knowns.total_dormant_risks (integer)
 * - endpoint.unknown_knowns.risk_level (keyword)
 *
 * Lifecycle fields:
 * - endpoint.lifecycle.first_seen (date)
 * - endpoint.lifecycle.last_seen (date)
 */
export const ENDPOINT_ASSETS_INDEX_MAPPING_REFERENCE = {
  entity: {
    id: 'keyword',
    name: 'keyword',
    type: 'keyword',
    sub_type: 'keyword',
    source: 'keyword',
  },
  asset: {
    category: 'keyword',
    platform: 'keyword',
  },
  host: {
    id: 'keyword',
    name: 'keyword',
    os: {
      platform: 'keyword',
    },
  },
  endpoint: {
    hardware: {
      cpu: 'keyword',
      cpu_cores: 'long',
      memory_gb: 'double',
      vendor: 'keyword',
      model: 'keyword',
      serial: 'keyword',
    },
    posture: {
      score: 'integer',
      level: 'keyword',
      disk_encryption: 'boolean',
      firewall_enabled: 'boolean',
      secure_boot: 'boolean',
      checks: {
        passed: 'integer',
        failed: 'integer',
        total: 'integer',
      },
      failed_checks: 'keyword',
    },
    privileges: {
      admin_count: 'integer',
      local_admins: 'keyword',
      elevated_risk: 'boolean',
    },
    software: {
      installed_count: 'integer',
      services_count: 'integer',
    },
    network: {
      listening_ports_count: 'integer',
    },
    unknown_knowns: {
      ssh_keys_over_180d: 'integer',
      dormant_users_30d: 'integer',
      dormant_users_list: 'keyword',
      external_cron_jobs: 'integer',
      external_launch_items: 'integer',
      external_tasks_windows: 'integer',
      total_dormant_risks: 'integer',
      risk_level: 'keyword',
    },
    lifecycle: {
      first_seen: 'date',
      last_seen: 'date',
    },
  },
} as const;

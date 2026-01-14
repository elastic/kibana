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

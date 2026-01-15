/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Endpoint Asset Visibility & Security Posture - Type Definitions
 *
 * Schema is designed to be compatible with:
 * - Entity Store (.entities.v1.latest.security_*)
 * - Asset Inventory (entities-generic-latest)
 * - ECS (host.*, agent.*)
 *
 * @see /Users/tomaszciecierski/Projects/elastic/kibana/.claude/plans/asset-management/schema-alignment-entity-store.md
 */

import {
  POSTURE_LEVELS,
  POSTURE_STATUS,
  ENTITY_TYPE,
  ENTITY_SUB_TYPE,
  ENTITY_SOURCE,
  ASSET_CRITICALITY_LEVELS,
} from './constants';

// =============================================================================
// Core Enums & Literal Types
// =============================================================================

/** Posture level: LOW, MEDIUM, HIGH, CRITICAL */
export type PostureLevel = (typeof POSTURE_LEVELS)[keyof typeof POSTURE_LEVELS];

/** Posture status: OK, FAIL, UNKNOWN */
export type PostureStatus = (typeof POSTURE_STATUS)[keyof typeof POSTURE_STATUS];

/** Entity type: host */
export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

/** Entity sub-type: endpoint, cloud_host */
export type EntitySubType = (typeof ENTITY_SUB_TYPE)[keyof typeof ENTITY_SUB_TYPE];

/** Entity source: osquery, cloud_asset_discovery */
export type EntitySourceType = (typeof ENTITY_SOURCE)[keyof typeof ENTITY_SOURCE];

/** Asset criticality levels from Asset Inventory */
export type AssetCriticality = (typeof ASSET_CRITICALITY_LEVELS)[keyof typeof ASSET_CRITICALITY_LEVELS];

/** Platform type */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/** Asset category */
export type AssetCategory = 'endpoint' | 'cloud_resource';

// =============================================================================
// Entity Store Compatible Fields
// =============================================================================

/**
 * Entity identity fields - compatible with Entity Store
 */
export interface EntityIdentity {
  /** Primary identifier - maps to host.id */
  id: string;
  /** Display name - maps to host.name */
  name: string;
  /** Entity type - always 'host' for endpoints */
  type: EntityType;
  /** Sub-type to differentiate from cloud hosts */
  sub_type: EntitySubType;
  /** Data source identifier */
  source: EntitySourceType;
  /** Risk from Risk Engine (future integration) */
  risk?: {
    calculated_level?: 'Low' | 'Moderate' | 'High' | 'Critical';
    calculated_score?: number;
  };
}

// =============================================================================
// Asset Inventory Compatible Fields
// =============================================================================

/**
 * Asset fields - compatible with Asset Inventory
 */
export interface AssetAttributes {
  /** Asset criticality level - shared with Asset Inventory */
  criticality?: AssetCriticality;
  /** Platform: windows, macos, linux */
  platform: Platform;
  /** Asset category: 'endpoint' vs 'cloud_resource' */
  category: AssetCategory;
}

// =============================================================================
// ECS Compatible Fields
// =============================================================================

/**
 * ECS Host fields for correlation with other security data
 */
export interface HostFields {
  id: string;
  name: string;
  hostname?: string;
  os: {
    name?: string;
    version?: string;
    platform?: string;
    family?: string;
  };
  architecture?: string;
  ip?: string[];
  mac?: string[];
}

/**
 * ECS Agent fields
 */
export interface AgentFields {
  id?: string;
  name?: string;
  type?: string;
  version?: string;
}

// =============================================================================
// Endpoint-Specific Domain Fields
// =============================================================================

/**
 * Endpoint lifecycle tracking
 */
export interface EndpointLifecycle {
  /** First time this asset was seen */
  first_seen: string;
  /** Last time this asset was seen */
  last_seen: string;
  /** Last time this document was updated */
  last_updated?: string;
}

/**
 * Hardware facts from osquery
 */
export interface EndpointHardware {
  cpu?: string;
  cpu_cores?: number;
  memory_gb?: number;
  vendor?: string;
  model?: string;
}

/**
 * Network interface information
 */
export interface NetworkInterface {
  name: string;
  mac?: string;
  ip?: string[];
}

/**
 * Network facts
 */
export interface EndpointNetwork {
  interfaces?: NetworkInterface[];
  listening_ports_count?: number;
}

/**
 * Software inventory summary
 */
export interface EndpointSoftware {
  installed_count?: number;
  services_count?: number;
}

/**
 * Security posture checks result
 */
export interface PostureChecks {
  passed: number;
  failed: number;
  total: number;
}

/**
 * Security posture assessment
 */
export interface EndpointPosture {
  /** Posture score 0-100 */
  score: number;
  /** Posture level: LOW, MEDIUM, HIGH, CRITICAL */
  level: PostureLevel;
  /** Disk encryption status */
  disk_encryption: PostureStatus;
  /** Firewall enabled status */
  firewall_enabled: boolean;
  /** Secure boot status */
  secure_boot: boolean;
  /** Check results summary */
  checks: PostureChecks;
  /** List of failed check names */
  failed_checks: string[];
}

/**
 * Privilege analysis
 */
export interface EndpointPrivileges {
  /** List of local admin usernames */
  local_admins: string[];
  /** Count of local admins */
  admin_count: number;
  /** List of root/UID 0 users */
  root_users: string[];
  /** Whether elevated privilege risk exists */
  elevated_risk: boolean;
}

/**
 * Drift detection - comprehensive tracking
 */
export interface EndpointDrift {
  /** Last configuration change timestamp */
  last_change?: string;
  /** Types of changes detected */
  change_types: string[];
  /** Whether recently changed (within threshold) */
  recently_changed: boolean;

  /** Events in last 24 hours */
  events_24h?: {
    /** Total event count */
    total: number;
    /** Events by category breakdown */
    by_category: {
      privileges: number;
      persistence: number;
      network: number;
      software: number;
      posture: number;
    };
    /** Events by severity breakdown */
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };

  /** Most recent significant changes (top 10) */
  recent_changes?: Array<{
    timestamp: string;
    category: string;
    action: string;
    item_name: string;
  }>;
}

/**
 * Drift event categories and actions
 */
export type DriftCategory = 'privileges' | 'persistence' | 'network' | 'software' | 'posture';
export type DriftAction = 'added' | 'removed' | 'changed';
export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Individual drift event document
 */
export interface DriftEvent {
  '@timestamp': string;

  host: {
    id: string;
    name: string;
    os: {
      platform: string;
    };
  };

  agent: {
    id: string;
  };

  drift: {
    category: DriftCategory;
    action: DriftAction;
    severity: DriftSeverity;
    item: {
      type: string;
      name: string;
      value?: string;
      previous_value?: string;
    };
    query_id: string;
    query_name: string;
  };

  osquery: Record<string, unknown>;

  event: {
    kind: 'event';
    category: ['configuration'];
    type: ['change'];
    action: string;
  };
}

/**
 * Unknown Knowns - Dormant risk indicators
 * Detects forgotten access, old credentials, and external dependencies
 */
export interface EndpointUnknownKnowns {
  /** SSH keys older than 180 days (not rotated) */
  ssh_keys_over_180d: number;
  /** Users with no login in 30+ days */
  dormant_users_30d: number;
  /** List of dormant usernames */
  dormant_users_list?: string[];
  /** Windows scheduled tasks calling external URLs */
  external_tasks_windows: number;
  /** Windows external task names */
  external_tasks_list?: string[];
  /** Linux/macOS cron jobs calling external URLs */
  external_cron_jobs: number;
  /** macOS launch items calling external URLs */
  external_launch_items: number;
  /** Total dormant risk count */
  total_dormant_risks: number;
  /** Risk level based on dormant risk count */
  risk_level: 'low' | 'medium' | 'high';
}

/**
 * All endpoint-specific fields
 */
export interface EndpointDomainFields {
  lifecycle: EndpointLifecycle;
  hardware: EndpointHardware;
  network: EndpointNetwork;
  software: EndpointSoftware;
  posture: EndpointPosture;
  privileges: EndpointPrivileges;
  drift: EndpointDrift;
  /** Unknown Knowns - dormant risk indicators */
  unknown_knowns?: EndpointUnknownKnowns;
}

// =============================================================================
// Complete Endpoint Asset Document
// =============================================================================

/**
 * Complete Endpoint Asset document as stored in asset_manager_assets-*
 *
 * This schema is designed to be compatible with Entity Store for future integration.
 */
export interface EndpointAsset {
  /** Entity Store compatible identity fields */
  entity: EntityIdentity;

  /** Asset Inventory compatible fields */
  asset: AssetAttributes;

  /** ECS host fields for correlation */
  host: HostFields;

  /** ECS agent fields */
  agent?: AgentFields;

  /** Endpoint-specific domain fields */
  endpoint: EndpointDomainFields;

  /** Document timestamp */
  '@timestamp': string;

  /** Event metadata for Entity Store compatibility */
  event?: {
    ingested?: string;
    kind?: 'state';
  };
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface ListAssetsRequest {
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  platform?: Platform;
  posture_level?: PostureLevel;
  criticality?: AssetCriticality;
  search?: string;
}

export interface ListAssetsResponse {
  assets: EndpointAsset[];
  total: number;
  page: number;
  per_page: number;
}

export interface GetAssetRequest {
  asset_id: string;
}

export interface GetAssetResponse {
  asset: EndpointAsset;
}

export interface PostureSummaryResponse {
  total_assets: number;
  posture_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  failed_checks_by_type: Record<string, number>;
  average_score: number;
}

export interface PrivilegesSummaryResponse {
  total_assets: number;
  assets_with_elevated_privileges: number;
  total_local_admins: number;
  average_admin_count: number;
}

export interface DriftSummaryResponse {
  total_events: number;
  events_by_category: {
    privileges: number;
    persistence: number;
    network: number;
    software: number;
    posture: number;
  };
  events_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  assets_with_changes: number;
  top_changed_assets: Array<{
    host_id: string;
    host_name: string;
    event_count: number;
  }>;
  recent_changes: Array<{
    timestamp: string;
    host_id: string;
    host_name: string;
    category: string;
    action: string;
    item_name: string;
    severity: string;
  }>;
  time_range: string;
  /** Current page number (1-based) */
  page?: number;
  /** Number of items per page */
  page_size?: number;
  /** Total number of recent changes matching filters */
  total_recent_changes?: number;
}

export interface UnknownKnownsSummaryResponse {
  /** Total assets analyzed */
  total_assets: number;
  /** Assets with at least one dormant risk */
  assets_with_dormant_risks: number;
  /** Total SSH keys older than 180 days across fleet */
  ssh_keys_over_180d: number;
  /** Total dormant users (30+ days no login) across fleet */
  dormant_users_30d: number;
  /** Total external scheduled tasks/cron jobs */
  external_tasks_total: number;
  /** Distribution by risk level */
  risk_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  /** Top assets by dormant risk count */
  top_risk_assets: Array<{
    entity_id: string;
    entity_name: string;
    platform: string;
    total_dormant_risks: number;
    risk_level: string;
  }>;
  /** Most common dormant users across fleet */
  top_dormant_users: Array<{
    username: string;
    asset_count: number;
  }>;
}

export interface DriftEventsRequest {
  time_range?: string;
  categories?: DriftCategory[];
  severities?: DriftSeverity[];
  page?: number;
  page_size?: number;
}

export interface DriftEventsResponse {
  events: DriftEvent[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransformStatusResponse {
  transform_id: string;
  status: 'started' | 'stopped' | 'failed' | 'indexing' | 'not_found';
  documents_processed?: number;
  last_checkpoint?: string;
  error?: string;
}

// =============================================================================
// Privileges Tab UI Types
// =============================================================================

/** Risk level for privilege analysis */
export type PrivilegeRiskLevel = 'low' | 'medium' | 'high';

/**
 * Single asset with privilege information for UI display
 */
export interface PrivilegeAsset {
  /** Entity ID from transform */
  entityId: string;
  /** Display name of the asset */
  entityName: string;
  /** Platform: windows, macos, linux */
  platform: string;
  /** Number of local admin accounts */
  adminCount: number;
  /** List of admin usernames */
  adminUsers: string[];
  /** Risk level based on admin count */
  riskLevel: PrivilegeRiskLevel;
  /** Whether admin count exceeds threshold (>2) */
  hasElevatedRisk: boolean;
}

/**
 * Admin user aggregated across the fleet
 */
export interface TopAdminUser {
  /** Username */
  username: string;
  /** Number of assets where this user is admin */
  assetCount: number;
  /** User type classification */
  userType: 'built-in' | 'service' | 'user' | 'suspicious';
}

/**
 * Complete privileges summary for the Privileges tab
 */
export interface PrivilegesSummary {
  /** Total admin accounts across all assets */
  totalAdminAccounts: number;
  /** Number of assets with elevated risk (>2 admins) */
  assetsWithElevatedRisk: number;
  /** Average admin count per asset */
  averageAdminCount: number;
  /** Number of unique admin usernames across fleet */
  uniqueAdminUsers: number;
  /** Distribution by risk level */
  riskDistribution: {
    /** 0-2 admins */
    low: number;
    /** 3-4 admins */
    medium: number;
    /** 5+ admins */
    high: number;
  };
  /** Per-asset privilege data */
  assets: PrivilegeAsset[];
  /** Top admin users across fleet */
  topAdminUsers: TopAdminUser[];
}

// =============================================================================
// Posture Check Types
// =============================================================================

export interface PostureCheck {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  deduction: number;
  evaluate: (asset: EndpointAsset) => PostureCheckResult;
}

export interface PostureCheckResult {
  check_id: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Query Types
// =============================================================================

export interface SavedOsqueryQuery {
  id: string;
  name: string;
  query: string;
  description?: string;
  platform?: Platform | 'all';
  interval?: number;
  category: 'core' | 'software' | 'posture' | 'privilege' | 'control' | 'drift';
}

// =============================================================================
// Transform Types
// =============================================================================

export interface AssetTransformConfig {
  transform_id: string;
  source_index: string;
  dest_index: string;
  frequency: string;
  sync_delay: string;
  query_filter?: Record<string, unknown>;
}

// =============================================================================
// Snapshot Comparison Types
// =============================================================================

/**
 * Individual field difference between two snapshots
 */
export interface FieldDiff {
  /** Dot-notation path to the field (e.g., "endpoint.posture.firewall_enabled") */
  field_path: string;
  /** Value from Date A snapshot */
  value_a: unknown;
  /** Value from Date B snapshot */
  value_b: unknown;
  /** Type of change detected */
  change_type: 'added' | 'removed' | 'modified';
}

/**
 * Comparison result for a single asset between two snapshots
 */
export interface AssetComparison {
  /** Host ID for correlation */
  host_id: string;
  /** Host name for display */
  host_name: string;
  /** Whether asset exists in Date A snapshot */
  exists_in_a: boolean;
  /** Whether asset exists in Date B snapshot */
  exists_in_b: boolean;
  /** Whether any field differences were detected */
  has_changes: boolean;
  /** Count of changed fields */
  change_count: number;
  /** List of field-level differences */
  diffs: FieldDiff[];
  /** Full document from Date A (optional, for detailed view) */
  document_a?: Record<string, unknown>;
  /** Full document from Date B (optional, for detailed view) */
  document_b?: Record<string, unknown>;
}

/**
 * Response from snapshot comparison API
 */
export interface SnapshotCompareResponse {
  /** Date A being compared (YYYY-MM-DD) */
  date_a: string;
  /** Date B being compared (YYYY-MM-DD) */
  date_b: string;
  /** Total number of assets across both snapshots */
  total_assets: number;
  /** Number of assets with at least one field change */
  assets_with_changes: number;
  /** Number of assets present in B but not A */
  assets_added: number;
  /** Number of assets present in A but not B */
  assets_removed: number;
  /** List of asset comparisons */
  comparisons: AssetComparison[];
}

/**
 * Information about an available snapshot
 */
export interface SnapshotInfo {
  /** Snapshot date (YYYY-MM-DD) */
  date: string;
  /** Full index name */
  index_name: string;
  /** Number of documents in the snapshot */
  document_count: number;
}

/**
 * Response from list snapshots API
 */
export interface ListSnapshotsResponse {
  /** Available snapshots sorted by date descending */
  snapshots: SnapshotInfo[];
}

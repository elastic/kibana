/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Observable type keys matching Cases plugin observable types
 */
export enum ObservableTypeKey {
  IPv4 = 'observable-type-ipv4',
  IPv6 = 'observable-type-ipv6',
  Hostname = 'observable-type-hostname',
  Domain = 'observable-type-domain',
  URL = 'observable-type-url',
  FileHash = 'observable-type-file-hash',
  FileHashSHA256 = 'observable-type-file-hash-sha256',
  FileHashSHA1 = 'observable-type-file-hash-sha1',
  FileHashMD5 = 'observable-type-file-hash-md5',
  FilePath = 'observable-type-file-path',
  Email = 'observable-type-email',
  AgentId = 'observable-type-agent-id',
  User = 'observable-type-user',
}

/**
 * Extracted entity from an alert
 */
export interface ExtractedEntity {
  /** Observable type key */
  type: ObservableTypeKey;
  /** Original entity value as extracted */
  originalValue: string;
  /** Normalized entity value (lowercased, trimmed) */
  normalizedValue: string;
  /** Source alert ID that this entity was first found in */
  sourceAlertId: string;
  /** Source field this entity was extracted from */
  sourceField: string;
  /** Confidence score for this extraction (0-1) */
  confidence: number;
  /** Number of times this entity was seen across alerts */
  occurrenceCount: number;
  /** Alert IDs this entity was found in */
  alertIds: string[];
  /** First seen timestamp */
  firstSeen?: string;
  /** Last seen timestamp */
  lastSeen?: string;
}

/**
 * Configuration for entity type extraction
 */
export interface EntityTypeConfig {
  /** Observable type key */
  type: ObservableTypeKey;
  /** Alert fields to extract this entity type from */
  sourceFields: string[];
  /** Weight for weighted matching strategy (0-1) */
  weight?: number;
  /** Whether this entity is required for strict matching */
  required?: boolean;
}

/**
 * Default entity type configurations.
 *
 * Weights are tuned to prioritize high-signal entities (file hashes, unique IPs, domains)
 * and deprioritize noisy/common entities (generic users, system binaries, agent IDs).
 *
 * When hostPrimaryGrouping is enabled (default), hostname matching is handled
 * separately in the clustering pipeline, so its weight here is lower.
 */
export const DEFAULT_ENTITY_TYPE_CONFIGS: EntityTypeConfig[] = [
  {
    type: ObservableTypeKey.Hostname,
    sourceFields: ['host.name', 'host.hostname', 'host.id'],
    weight: 0.15, // Reduced: host-primary grouping handles this in clustering pipeline
  },
  {
    type: ObservableTypeKey.User,
    sourceFields: ['user.name', 'user.id'],
    weight: 0.05, // Very low: 'root'/'system' are everywhere; exclusion lists help but weight stays low
  },
  {
    type: ObservableTypeKey.IPv4,
    sourceFields: ['source.ip', 'destination.ip', 'host.ip', 'client.ip', 'server.ip'],
    weight: 0.3, // High: unique IPs are strong correlation signals
  },
  {
    type: ObservableTypeKey.IPv6,
    sourceFields: ['source.ip', 'destination.ip', 'host.ip', 'client.ip', 'server.ip'],
    weight: 0.3,
  },
  {
    type: ObservableTypeKey.Domain,
    sourceFields: ['url.domain', 'dns.question.name', 'destination.domain'],
    weight: 0.35, // High: C2 domains are excellent correlation signals
  },
  {
    type: ObservableTypeKey.FileHashSHA256,
    sourceFields: ['file.hash.sha256', 'process.hash.sha256'],
    weight: 0.5, // Highest: file hashes are the strongest IOC
  },
  {
    type: ObservableTypeKey.FileHashSHA1,
    sourceFields: ['file.hash.sha1', 'process.hash.sha1'],
    weight: 0.4,
  },
  {
    type: ObservableTypeKey.FileHashMD5,
    sourceFields: ['file.hash.md5', 'process.hash.md5'],
    weight: 0.3,
  },
  {
    type: ObservableTypeKey.FilePath,
    sourceFields: ['file.path', 'process.executable'],
    weight: 0.02, // Very low: system binaries are everywhere; exclusion lists filter most noise
  },
  {
    type: ObservableTypeKey.URL,
    sourceFields: ['url.full', 'url.original'],
    weight: 0.35,
  },
  {
    type: ObservableTypeKey.AgentId,
    sourceFields: ['agent.id'],
    weight: 0.05, // Very low: agent ID is per-host, already handled by host-primary grouping
  },
  {
    type: ObservableTypeKey.Email,
    sourceFields: ['user.email', 'email.from.address', 'email.to.address', 'source.user.email'],
    weight: 0.25,
  },
];

/**
 * Grouping strategy for matching alerts to cases
 */
export enum GroupingStrategy {
  /** All configured required entity types must match */
  Strict = 'strict',
  /** Any entity match groups alert to case */
  Relaxed = 'relaxed',
  /** Use entity weights with threshold */
  Weighted = 'weighted',
  /** Entity match within time window */
  Temporal = 'temporal',
}

/**
 * Entity exclusion configuration - prevents common/generic values from polluting matching
 */
export interface EntityExclusionConfig {
  /** Common usernames to exclude from matching (e.g., 'root', 'system') */
  excludedUsers?: string[];
  /** File path prefixes to exclude (e.g., '/usr/bin/', '/bin/') */
  excludedPathPrefixes?: string[];
  /** Specific file paths to exclude */
  excludedPaths?: string[];
  /** Custom exclusion patterns (regex) per entity type */
  customExclusions?: Partial<Record<ObservableTypeKey, string[]>>;
}

/**
 * Default entity exclusion configuration
 */
export const DEFAULT_ENTITY_EXCLUSIONS: EntityExclusionConfig = {
  excludedUsers: [
    'root',
    'system',
    'nobody',
    'www-data',
    'daemon',
    'bin',
    'sys',
    'sync',
    'games',
    'man',
    'lp',
    'mail',
    'news',
    'uucp',
    'proxy',
    'backup',
    'list',
    'irc',
    'gnats',
    'sshd',
    'systemd-network',
    'systemd-resolve',
    'messagebus',
    'systemd-timesync',
    'ntp',
    'local_service',
    'network_service',
    'local service',
    'network service',
    'nt authority\\system',
    'nt authority\\local service',
    'nt authority\\network service',
  ],
  excludedPathPrefixes: [
    '/usr/bin/',
    '/usr/sbin/',
    '/bin/',
    '/sbin/',
    '/usr/lib/',
    '/usr/local/bin/',
    '/usr/local/sbin/',
    'c:\\windows\\system32\\',
    'c:\\windows\\syswow64\\',
  ],
  excludedPaths: [],
};

/**
 * Temporal clustering configuration for splitting host-level groups into time-based phases
 */
export interface TemporalClusteringConfig {
  /** Enable temporal clustering within host groups */
  enabled?: boolean;
  /** Minimum gap (in minutes) between alerts to start a new cluster */
  gapThresholdMinutes?: number;
  /** Minimum alerts per cluster (clusters below this are merged with nearest neighbor) */
  minClusterSize?: number;
  /** Maximum alerts per cluster (large clusters may indicate noise) */
  maxClusterSize?: number;
}

/**
 * Process tree configuration for correlating alerts by execution ancestry
 */
export interface ProcessTreeConfig {
  /** Enable process tree correlation */
  enabled?: boolean;
  /** Max depth to trace parent processes */
  maxDepth?: number;
  /** Process names to exclude from tree building (common shells/interpreters) */
  excludedProcesses?: string[];
}

/**
 * Cross-host correlation configuration for detecting lateral movement
 */
export interface CrossHostCorrelationConfig {
  /** Enable cross-host correlation */
  enabled?: boolean;
  /** Maximum time window (minutes) for temporal cross-host correlation */
  timeWindowMinutes?: number;
  /** Minimum confidence score (0-1) for creating cross-host links */
  minConfidence?: number;
  /** Use network flow data for correlation */
  useNetworkData?: boolean;
  /** MITRE technique IDs that indicate lateral movement */
  lateralMovementTechniques?: string[];
}

/**
 * LLM classification configuration for AI-enhanced grouping
 */
export interface LLMClassificationConfig {
  /** Enable LLM-based sub-classification of clusters */
  enabled?: boolean;
  /** Use AD feedback loop to refine grouping after Attack Discovery */
  adFeedbackLoop?: boolean;
  /** Maximum alert summaries to send per LLM classification call */
  maxAlertsPerClassification?: number;
}

/**
 * Configuration for alert grouping
 */
export interface GroupingConfig {
  /** Grouping strategy to use */
  strategy: GroupingStrategy;
  /** Entity types to use for grouping */
  entityTypes: EntityTypeConfig[];
  /** Match score threshold for weighted strategy (0-1) */
  threshold?: number;
  /** Time window for temporal strategy (ISO 8601 duration) */
  timeWindow?: string;
  /**
   * Time proximity window for grouping alerts (ISO 8601 duration, e.g., "4h", "24h").
   * Alerts must be within this time window of the case's most recent alert to be grouped.
   * If not set, time proximity is not considered.
   */
  timeProximityWindow?: string;
  /** Create new case if no match found */
  createNewCaseIfNoMatch?: boolean;
  /** Maximum alerts per case */
  maxAlertsPerCase?: number;
  /** Merge similar cases with high entity overlap */
  mergeSimilarCases?: boolean;
  /** Entity overlap threshold for case merging (0-1) */
  mergeThreshold?: number;
  /** Use host.name as the primary grouping dimension (recommended) */
  hostPrimaryGrouping?: boolean;
  /** Entity exclusion configuration to filter out generic/noisy entities */
  entityExclusions?: EntityExclusionConfig;
  /** Temporal clustering within host groups */
  temporalClustering?: TemporalClusteringConfig;
  /** Process tree correlation */
  processTree?: ProcessTreeConfig;
  /** Cross-host lateral movement correlation */
  crossHostCorrelation?: CrossHostCorrelationConfig;
  /** Tactic-based sub-grouping (disabled by default — most attack operations span the full kill chain) */
  tacticSubGrouping?: { enabled?: boolean };
  /** LLM-enhanced classification */
  llmClassification?: LLMClassificationConfig;
}

/**
 * Alert filter configuration
 */
export interface AlertFilter {
  /** Elasticsearch index pattern for alerts */
  alertsIndexPattern?: string;
  /** Exclude alerts with these tags */
  excludeTags?: string[];
  /** Only process alerts with these statuses */
  includeStatuses?: Array<'open' | 'acknowledged' | 'closed'>;
  /** Minimum alert severity to process */
  severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
  /** Time range for alerts */
  timeRange?: {
    start?: string;
    end?: string;
  };
  /** Additional Elasticsearch query DSL filter */
  customFilter?: Record<string, unknown>;
  /** Maximum alerts to process per run (0 = unlimited) */
  maxAlertsPerRun?: number;
}

/**
 * Workflow schedule configuration
 */
export interface WorkflowSchedule {
  /** Schedule interval (ISO 8601 duration or cron expression) */
  interval: string;
  /** Timezone for the schedule */
  timezone?: string;
  /** Whether to run on weekends */
  runOnWeekends?: boolean;
}

/**
 * Case template for creating new cases
 */
export interface CaseTemplate {
  /** Title template with placeholders */
  titleTemplate?: string;
  /** Description template with placeholders */
  descriptionTemplate?: string;
  /** Default case severity */
  severity?: 'low' | 'medium' | 'high' | 'critical';
  /** Case owner (plugin ID) */
  owner?: string;
  /** Default assignees (user IDs) */
  assignees?: string[];
  /** Tags to add to new cases */
  tags?: string[];
}

/**
 * Attack Discovery configuration for workflow
 */
export interface AttackDiscoveryConfig {
  /** Enable automatic Attack Discovery generation */
  enabled?: boolean;
  /** Attack Discovery mode */
  mode?: 'full' | 'incremental' | 'delta';
  /** Minimum new alerts before triggering AD */
  triggerOnAlertCount?: number;
  /** Debounce period before running AD (ISO 8601 duration) */
  triggerDebounce?: string;
  /** Attach Attack Discovery results to case */
  attachToCase?: boolean;
  /**
   * Validate alert relevance after Attack Discovery generation.
   * If enabled, alerts that weren't part of the discovered attack
   * will be detached from the case and their llm-triaged tag removed
   * so they can be re-processed in the next workflow run.
   */
  validateAlertRelevance?: boolean;
  /**
   * Enable case merging based on Attack Discovery analysis.
   * If enabled, cases with Attack Discoveries that indicate the same attack
   * will be merged into a single case with a note explaining why.
   */
  enableCaseMerging?: boolean;
  /**
   * Similarity threshold for Attack Discovery-based case merging (0-1).
   * Cases with AD similarity above this threshold will be merged.
   * Default: 0.7
   */
  caseMergeSimilarityThreshold?: number;
}

/**
 * API configuration for LLM connector
 */
export interface ApiConfig {
  /** Connector ID */
  connectorId: string;
  /** Action type ID */
  actionTypeId: string;
  /** Model identifier */
  model?: string;
}

/**
 * Alert grouping workflow configuration
 */
export interface AlertGroupingWorkflowConfig {
  /** Unique workflow ID */
  id?: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Whether workflow is enabled */
  enabled?: boolean;
  /** Schedule configuration */
  schedule: WorkflowSchedule;
  /** Alert filter configuration */
  alertFilter?: AlertFilter;
  /** Grouping configuration */
  groupingConfig: GroupingConfig;
  /** Attack Discovery configuration */
  attackDiscoveryConfig?: AttackDiscoveryConfig;
  /** API configuration for LLM */
  apiConfig?: ApiConfig;
  /** Case template for new cases */
  caseTemplate?: CaseTemplate;
  /** Tags to add to created/updated cases */
  tags?: string[];
  /** Space ID this workflow belongs to */
  spaceId?: string;
  /** Created timestamp */
  createdAt?: string;
  /** Created by user */
  createdBy?: string;
  /** Updated timestamp */
  updatedAt?: string;
  /** Updated by user */
  updatedBy?: string;
}

/**
 * Workflow execution status
 */
export enum WorkflowExecutionStatus {
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/**
 * Workflow execution metrics
 */
export interface WorkflowExecutionMetrics {
  /** Total alerts scanned */
  alertsScanned: number;
  /** Alerts that matched filters */
  alertsProcessed: number;
  /** Alerts attached to cases */
  alertsGrouped: number;
  /** Unique entities extracted */
  entitiesExtracted: number;
  /** Existing cases matched */
  casesMatched: number;
  /** New cases created */
  casesCreated: number;
  /** Existing cases updated */
  casesUpdated: number;
  /** Attack Discoveries generated */
  attackDiscoveriesGenerated: number;
  /** Attack Discoveries incrementally merged */
  attackDiscoveriesMerged: number;
  /** Alerts removed from cases after validation (not part of attack) */
  alertsRemovedFromCases: number;
  /** Cases merged based on Attack Discovery similarity */
  casesMerged: number;
  /** Total execution duration in milliseconds */
  durationMs: number;
}

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  /** Unique execution ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Execution status */
  status: WorkflowExecutionStatus;
  /** Started timestamp */
  startedAt: string;
  /** Completed timestamp */
  completedAt?: string;
  /** How execution was triggered */
  triggeredBy: 'schedule' | 'manual' | 'trigger';
  /** Error message if failed */
  error?: string;
  /** Execution metrics */
  metrics?: WorkflowExecutionMetrics;
  /** Whether this was a dry run */
  isDryRun?: boolean;
}

/**
 * Case match result from matching engine
 */
export interface CaseMatch {
  /** Case ID */
  caseId: string;
  /** Case title */
  caseTitle: string;
  /** Case status */
  caseStatus?: string;
  /** Match score (0-1) */
  matchScore: number;
  /** Matched observables */
  matchedObservables: Array<{
    observableId: string;
    type: ObservableTypeKey;
    value: string;
    matchedEntity: ExtractedEntity;
  }>;
  /** Number of alerts attached to case */
  alertCount?: number;
  /** Case creation timestamp */
  createdAt?: string;
}

/**
 * Alert match result
 */
export interface AlertMatch {
  /** Alert ID */
  alertId: string;
  /** Match score (0-1) */
  matchScore: number;
  /** Entities that matched */
  matchedEntities: Array<{
    entityType: ObservableTypeKey;
    entityValue: string;
    observableId: string;
    alertField: string;
  }>;
}

/**
 * Entity extraction result
 */
export interface EntityExtractionResult {
  /** Number of alerts processed */
  alertsProcessed: number;
  /** Extracted entities */
  entities: ExtractedEntity[];
  /** Count of entities by type */
  entitySummary: Record<ObservableTypeKey, number>;
}

/**
 * Dry run result for workflow preview
 */
export interface DryRunResult {
  /** Alerts that would be processed */
  alertsToProcess: number;
  /** Grouping preview */
  groupings: Array<{
    caseId?: string;
    caseTitle?: string;
    isNewCase: boolean;
    alertIds: string[];
    matchScore: number;
    observablesToAdd: Array<{
      type: ObservableTypeKey;
      value: string;
    }>;
  }>;
  /** Cases that would be created */
  casesToCreate: number;
  /** Cases that would be updated */
  casesToUpdate: number;
  /** Observables that would be added */
  observablesToAdd: number;
}

/**
 * Case event trigger configuration
 */
export interface CaseTriggerConfig {
  /** Unique trigger ID */
  id?: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Whether trigger is enabled */
  enabled?: boolean;
  /** Event type that triggers the action */
  eventType: 'alert_attached' | 'observable_added' | 'case_created' | 'case_updated';
  /** Trigger conditions */
  conditions?: {
    /** Only trigger for cases with these tags */
    caseTags?: string[];
    /** Only trigger for cases owned by this plugin */
    caseOwner?: string;
    /** Minimum alerts attached before triggering */
    minAlerts?: number;
    /** Only trigger for alerts with these severities */
    alertSeverity?: Array<'low' | 'medium' | 'high' | 'critical'>;
    /** Debounce period between triggers (ISO 8601 duration) */
    debounce?: string;
  };
  /** Action to execute */
  action: {
    type: 'generate_attack_discovery' | 'run_workflow' | 'webhook';
    config: Record<string, unknown>;
  };
  /** Space ID this trigger belongs to */
  spaceId?: string;
  /** Created timestamp */
  createdAt?: string;
  /** Created by user */
  createdBy?: string;
  /** Last triggered timestamp */
  lastTriggered?: string;
  /** Trigger count */
  triggerCount?: number;
}

/**
 * Feature configuration for alert grouping
 */
export interface AlertGroupingFeatureConfig {
  /** Whether alert grouping is enabled globally */
  enabled: boolean;
  /** Per-space overrides */
  spaceOverrides?: Record<string, boolean>;
}

/**
 * Batch processing options for Attack Discovery
 */
export interface BatchProcessingOptions {
  /** Number of alerts per batch */
  batchSize?: number;
  /** Maximum total alerts to process (0 = unlimited) */
  maxTotalAlerts?: number;
  /** Number of batches to process in parallel */
  parallelBatches?: number;
  /** Strategy for merging batch results */
  mergeStrategy?: 'sequential' | 'hierarchical' | 'map_reduce';
  /** Enable alert deduplication before processing */
  deduplication?: boolean;
  /** Preset for alert deduplication */
  deduplicationPreset?: 'malware' | 'processBased' | 'userFocused' | 'networkBased' | 'aggressive';
}

/**
 * Incremental Attack Discovery request
 */
export interface IncrementalAttackDiscoveryRequest {
  /** API configuration */
  apiConfig: ApiConfig;
  /** Anonymization fields */
  anonymizationFields: Array<{
    field: string;
    allowed?: boolean;
    anonymized?: boolean;
  }>;
  /** Alerts index pattern */
  alertsIndexPattern?: string;
  /** Case ID to scope Attack Discovery to */
  caseId?: string;
  /** Specific alert IDs to process */
  alertIds?: string[];
  /** Enable incremental mode */
  incremental?: boolean;
  /** ID of existing Attack Discovery to enhance */
  existingAttackDiscoveryId?: string;
  /** Additional filter */
  filter?: Record<string, unknown>;
  /** Time range */
  timeRange?: {
    start?: string;
    end?: string;
  };
  /** Processing options */
  processingOptions?: BatchProcessingOptions;
}

/**
 * Cached batch size configuration per connector
 */
export interface BatchSizeCache {
  /** Connector ID */
  connectorId: string;
  /** Last successful batch size */
  batchSize: number;
  /** Last updated timestamp */
  updatedAt: string;
}

// ============================================================
// Alert Clustering Types (Tier 2-4)
// ============================================================

/**
 * Process node in a process tree
 */
export interface ProcessNode {
  /** Process name */
  name: string;
  /** Process executable path */
  executable: string;
  /** Parent process name */
  parentName?: string;
  /** Parent process executable path */
  parentExecutable?: string;
  /** Process arguments */
  args?: string[];
  /** Alert IDs that reference this process */
  alertIds: string[];
}

/**
 * Cross-host link indicating lateral movement or coordinated activity
 */
export interface CrossHostLink {
  /** Source host name */
  sourceHost: string;
  /** Target host name */
  targetHost: string;
  /** Type of link detected */
  linkType: 'temporal_tactic_match' | 'network_connection' | 'shared_ioc' | 'lateral_movement_rule';
  /** Confidence score (0-1) */
  confidence: number;
  /** Alert IDs involved in this link */
  alertIds: string[];
  /** Human-readable description */
  description: string;
}

/**
 * An intermediate alert cluster - a group of related alerts
 * produced by the multi-stage clustering pipeline
 */
export interface AlertCluster {
  /** Unique cluster ID */
  id: string;
  /** Host name this cluster belongs to */
  hostName: string;
  /** Alert IDs in this cluster */
  alertIds: string[];
  /** Alert indices for each alert ID */
  alertIndices: Map<string, string>;
  /** Earliest alert timestamp */
  earliestTimestamp: string;
  /** Latest alert timestamp */
  latestTimestamp: string;
  /** MITRE tactics observed in this cluster */
  tactics: string[];
  /** MITRE techniques observed in this cluster */
  techniques: string[];
  /** Process trees identified in this cluster */
  processTrees: ProcessNode[];
  /** Entities extracted for this cluster */
  entities: ExtractedEntity[];
  /** Cross-host links to/from this cluster */
  crossHostLinks: CrossHostLink[];
  /** Overall cluster confidence score (0-1) */
  confidence: number;
  /** LLM classification label (populated in Tier 4) */
  llmClassification?: string;
  /** LLM-generated cluster description (populated in Tier 4) */
  llmDescription?: string;
  /** Human-readable description of what this cluster represents */
  description: string;
  /** Alert documents (for LLM processing) */
  alerts?: Array<{ _id: string; _index: string; _source: Record<string, unknown> }>;
}

/**
 * Result of the alert clustering pipeline
 */
export interface ClusteringResult {
  /** All clusters produced */
  clusters: AlertCluster[];
  /** Cross-host links discovered */
  crossHostLinks: CrossHostLink[];
  /** Clustering metrics */
  metrics: {
    /** Total alerts processed */
    totalAlerts: number;
    /** Number of unique hosts */
    uniqueHosts: number;
    /** Number of clusters created */
    clustersCreated: number;
    /** Number of temporal splits performed */
    temporalSplits: number;
    /** Number of tactic-based sub-groups created */
    tacticSubGroups: number;
    /** Number of process tree correlations found */
    processTreeCorrelations: number;
    /** Number of cross-host links found */
    crossHostLinksFound: number;
  };
}

/**
 * Enhanced workflow execution metrics with clustering data
 */
export interface EnhancedWorkflowExecutionMetrics extends WorkflowExecutionMetrics {
  /** Number of host groups identified */
  hostGroups: number;
  /** Number of temporal clusters created */
  temporalClusters: number;
  /** Number of cross-host links detected */
  crossHostLinks: number;
  /** Number of LLM classification calls made */
  llmClassifications: number;
  /** Number of AD feedback refinements */
  adFeedbackRefinements: number;
}

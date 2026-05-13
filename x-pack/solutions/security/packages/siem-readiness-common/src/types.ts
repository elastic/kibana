/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IndexInfo {
  indexName: string;
  docs: number;
}

export type MainCategories = 'Endpoint' | 'Identity' | 'Network' | 'Cloud' | 'Application/SaaS';

export interface CategoryGroup {
  category: MainCategories | string;
  indices: IndexInfo[];
}

export interface CategoriesResponse {
  rawCategoriesMap: CategoryGroup[];
  mainCategoriesMap: CategoryGroup[];
}

// TODO: siem-readiness - Request ECS Data Quality Dashboard team to move these types to a common location
// (e.g., @kbn/ecs-data-quality-types or similar shared package) so they can be reused
// on the FE side without duplication. See:
// x-pack/solutions/security/plugins/ecs_data_quality_dashboard/server/schemas/result.ts
export interface DataQualityResultDocument {
  indexPattern?: string;
  checkedBy?: string;
  indexId?: string;
  ilmPhase?: string;
  batchId: string;
  indexName: string;
  isCheckAll: boolean;
  checkedAt: number;
  docsCount: number;
  totalFieldCount: number;
  ecsFieldCount: number;
  customFieldCount: number;
  incompatibleFieldCount: number;
  incompatibleFieldMappingItems: Array<{
    fieldName: string;
    expectedValue: string;
    actualValue: string;
    description: string;
  }>;
  incompatibleFieldValueItems: Array<{
    fieldName: string;
    expectedValues: string[];
    actualValues: Array<{ name: string; count: number }>;
    description: string;
  }>;
  sameFamilyFieldCount: number;
  sameFamilyFields: string[];
  sameFamilyFieldItems: Array<{
    fieldName: string;
    expectedValue: string;
    actualValue: string;
    description: string;
  }>;
  unallowedMappingFields: string[];
  unallowedValueFields: string[];
  sizeInBytes: number;
  markdownComments: string[];
  ecsVersion: string;
  error: string | null;
}

export interface RelatedIntegrationRuleResponse {
  related_integrations?: RelatedIntegration[];
  enabled?: boolean;
}

export interface RelatedIntegration {
  package: string;
  version?: string;
  integration?: string;
}

export interface SiemReadinessPackageInfo {
  id: string;
  name: string;
  title: string;
  version: string;
  status: string;
  categories?: string[];
  packagePoliciesInfo?: {
    count: number;
  };
}

export type DropSeverity = 'none' | 'warning' | 'critical';
export type LatencyStatus = 'ok' | 'warning' | 'critical' | 'unknown';

/**
 * Volume stats for an ingest pipeline, computed from a 7-day daily doc-count aggregation
 * across all the pipeline's target indices.
 */
export interface PipelineVolumeStats {
  // ── Volume / silence ──────────────────────────────────────────────────────

  /** Documents processed in the most recent calendar day (today, UTC midnight-boundary). */
  current24h: number;
  /** Average daily document count over the last 7 days (null when no historical data). */
  baseline: number | null;
  /**
   * Epoch milliseconds of the most recently indexed document across the pipeline's indices.
   * Null when the pipeline has no data or max(@timestamp) could not be retrieved.
   */
  lastEventMs: number | null;
  /**
   * Hours elapsed since the last indexed document. Null when lastEventMs is null.
   * Fractional, e.g. 1.5 = 90 minutes.
   */
  hoursSilent: number | null;
  /**
   * True when the most recent calendar day has 0 documents and the pipeline had a positive
   * baseline, indicating a complete telemetry stop that ingest failure rate cannot detect.
   */
  silenceDetected: boolean;
  /**
   * True when hours elapsed since the last event exceeds 2× the estimated inter-event
   * interval derived from the 7-day baseline. Indicates a statistically significant gap
   * even for low-volume pipelines.
   */
  criticalSilence: boolean;

  // ── Volume drop ───────────────────────────────────────────────────────────

  /**
   * Percentage the current 24h count is below the 7-day baseline (0–100).
   * Null when no baseline exists.
   */
  dropPercent: number | null;
  /**
   * Severity of the volume drop:
   * - "none": drop < 50 %
   * - "warning": drop ≥ 50 % (partial source loss, routing change, etc.)
   * - "critical": drop ≥ 90 %
   */
  dropSeverity: DropSeverity;

  // ── Ingestion latency ─────────────────────────────────────────────────────

  /**
   * 95th-percentile ingestion latency in milliseconds, computed as
   * event.ingested − event.created (fallback: event.ingested − @timestamp).
   * Null when neither field is present or the scripted aggregation failed.
   */
  latencyP95Ms: number | null;
}

export interface PipelineStats {
  name: string;
  indices: string[];
  docsCount: number;
  failedDocsCount: number;
  /** False when the server cannot provide ingestion stats (e.g. serverless mode). */
  statsAvailable: boolean;
  /** Volume trend stats. Null when the pipeline has no associated indices. */
  volume: PipelineVolumeStats | null;
}

export interface CasesSearchResponse {
  total: number;
  countOpenCases: number;
  countClosedCases: number;
  countInProgressCases: number;
}

// Retention types
export type RetentionType = 'ilm' | 'dsl' | null;
export type RetentionStatus = 'healthy' | 'non-compliant';

export interface RetentionInfo {
  indexName: string;
  isDataStream: boolean;
  retentionType: RetentionType;
  retentionPeriod: string | null;
  retentionDays: number | null;
  policyName: string | null;
  status: RetentionStatus;
}

// ── Compiled types (HTTP route response shapes) ───────────────────────────────

export interface CompiledPipeline extends PipelineStats {
  failureRate: string;
  status: 'critical' | 'healthy';
  statsAvailable: boolean;
  latencySlaMs: number;
  latencyStatus: LatencyStatus;
}

export interface CompiledContinuityData {
  summary: {
    totalPipelines: number;
    criticalPipelines: number;
    healthyPipelines: number;
    statsAvailable: boolean;
    criticalThreshold: string;
    silentPipelines: number;
    criticalSilencePipelines: number;
    latencyBreachPipelines: number;
  };
  byCategory: Array<{
    category: string;
    pipelineCount: number;
    criticalCount: number;
    pipelines: CompiledPipeline[];
  }>;
}

export interface CompiledRetentionIndex {
  indexName: string;
  isDataStream: boolean;
  managedBy: 'ILM' | 'DSL' | 'None';
  retentionPeriod: string;
  retentionDays: number | null;
  policyName: string | null;
  status: RetentionStatus;
}

export interface CompiledRetentionData {
  summary: {
    totalIndices: number;
    healthyCount: number;
    nonCompliantCount: number;
    complianceThreshold: string;
    serverlessMode: boolean;
  };
  byCategory: Array<{
    category: string;
    totalIndices: number;
    healthyCount: number;
    nonCompliantCount: number;
    indices: CompiledRetentionIndex[];
  }>;
}

export interface CompiledQualityIndex {
  indexName: string;
  status: 'healthy' | 'incompatible';
  incompatibleFieldCount: number;
  sameFamilyFieldCount: number;
  ecsFieldCount: number;
  customFieldCount: number;
  totalFieldCount: number;
  docsCount: number;
  lastChecked: string | null;
  ecsVersion: string | null;
  error: string | null;
}

export interface CompiledQualityData {
  summary: {
    totalChecked: number;
    totalIncompatible: number;
    totalHealthy: number;
    totalUnchecked: number;
    note?: string;
  };
  byCategory: Array<{
    category: string;
    totalActiveIndices: number;
    checkedCount: number;
    uncheckedCount: number;
    healthyCount: number;
    incompatibleCount: number;
    uncheckedIndices: string[];
    indices: CompiledQualityIndex[];
  }>;
}

export interface CompiledCategoryData {
  category: string;
  hasActiveData: boolean;
  indexCount: number;
  totalDocs: number;
  coveredRules: number;
  uncoveredRules: number;
  totalRulesWithIntegrations: number;
  mitreMappedRules: number;
  missingIntegrations: string[];
  activeEcsCategories: string[];
  expectedEcsCategories: string[];
}

export interface CompiledCoverageData {
  summary: {
    activeCategories: string[];
    inactiveCategories: string[];
    totalInstalledIntegrations: number;
  };
  categories: CompiledCategoryData[];
}

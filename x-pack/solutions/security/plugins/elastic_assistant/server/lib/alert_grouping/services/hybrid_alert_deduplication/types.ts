/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Types for the Hybrid Alert Deduplication system.
 *
 * Ported from https://github.com/elastic/alert-clustering
 */

/** A raw alert document (flat or nested ECS fields) */
export type AlertDocument = Record<string, unknown>;

/** An alert enriched with internal clustering metadata */
export interface EnrichedAlert extends AlertDocument {
  /** Feature vector computed from alert fields */
  vector: number[];
  /** Entity statistics for this alert (populated once it becomes a leader) */
  entities?: EntityStats;
  /** Common fields shared across followers (leader only) */
  common_fields?: string[];
  /** Exception list patterns that match followers (leader only) */
  exceptions?: ExceptionPattern[];
  /** Follower alerts that were clustered into this leader */
  followers?: AlertDocument[];
}

/** Entity statistics tracking unique values per entity field */
export interface EntityStats {
  /** Total number of alerts represented by this entity set */
  total: number;
  /** Map of entity field → unique values observed */
  [field: string]: number | string[];
}

/**
 * An exception pattern is a list of (field, wildcardPattern) tuples
 * used to quickly match future alerts against an existing cluster.
 */
export type ExceptionPattern = Array<[field: string, pattern: string]>;

/** Result of an LLM-based duplicate comparison */
export interface LLMComparisonResult {
  /** Whether the two alerts are considered duplicates */
  duplicate: boolean;
  /** Field names that are similar between the two alerts */
  common_fields: string[];
}

/** Configuration for the HybridClustering engine */
export interface HybridClusteringConfig {
  /**
   * Cosine distance threshold for Stage 1 (high-confidence) clustering.
   * Alerts within this distance are auto-clustered without LLM.
   * @default 0.004
   */
  highConfidenceThreshold?: number;
  /**
   * Cosine distance threshold for Stage 2 (LLM-assisted) clustering.
   * Leaders within this distance are candidates for LLM comparison.
   * @default 0.2
   */
  lowConfidenceThreshold?: number;
  /**
   * If set, use rank-based cutoff instead of threshold.
   * The top N closest leaders will be sent to the LLM.
   * @default 0 (disabled)
   */
  rankCutoff?: number;
  /** Enable debug logging */
  debugging?: boolean;
}

/** Metrics from a clustering run */
export interface ClusteringMetrics {
  /** Total number of clusters (leaders) */
  totalClusters: number;
  /** Total LLM comparison calls made */
  llmCalls: number;
  /** Total estimated LLM cost (USD) */
  totalCost: number;
}

/**
 * The LLM invocation function signature.
 * The clustering engine calls this to compare two alerts.
 * Implementations can use any LLM provider (Bedrock, OpenAI, Kibana connectors, etc.)
 */
export type LLMInvokeFn = (systemPrompt: string, userPrompt: string) => Promise<string>;

// ============================================================
// Constants
// ============================================================

/** Fields used to determine the rule name of an alert */
export const RULE_FIELDS = ['kibana.alert.rule.name', 'rule.name', 'event.code'] as const;

/** Field used to uniquely identify an alert */
export const UNIQUE_FIELD = 'event.id';

/** Entity values considered low-quality (e.g., SYSTEM SIDs) */
export const LOW_QUALITY_ENTITIES = ['S-1-5-18', 'S-1-5-19'] as const;

/** Fields used to track entity statistics */
export const ENTITY_FIELDS = ['agent.id', 'user.id', 'source.ip', 'cluster_uuid'] as const;

/**
 * Fields used for alert triage and vectorization.
 * These get dedicated vector space in the feature vector.
 */
export const TRIAGE_FIELDS = [
  'process.name',
  'process.executable',
  'process.command_line',
  'process.Ext.code_signature.subject_name',
  'dll.path',
  'file.path',
  'registry.path',
  'dns.question.name',
  'destination.ip',
  'process.Ext.api.summary',
  'process.thread.Ext.call_stack_summary',
  'process.thread.Ext.call_stack_final_user_module.path',
  'process.parent.name',
  'process.parent.executable',
  'process.parent.command_line',
  'process.Ext.effective_parent.name',
  'process.Ext.token.integrity_level_name',
] as const;

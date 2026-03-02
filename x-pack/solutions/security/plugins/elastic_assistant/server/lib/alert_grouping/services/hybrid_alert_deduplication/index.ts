/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hybrid Alert Deduplication System
 *
 * A security alert deduplication and clustering system that automatically groups
 * similar security alerts using hybrid vector and LLM comparison. This leads to
 * reduced analyst workload and improved context for other LLM systems.
 *
 * ## Architecture
 *
 * The hybrid multi-stage approach balances speed, accuracy, and intelligent
 * decision-making for security alert triage:
 *
 * - **Stage 1**: Initial ranking/thresholding based on cosine distance on alert
 *   feature vectors
 * - **Stage 2**: LLM-powered deduplication for high accuracy
 * - **Stage 3**: Automatic generation of patterns to efficiently match similar
 *   alerts (reducing future LLM calls)
 *
 * ## Core Components
 *
 * - `HybridClustering` - Main clustering engine with configurable confidence
 *   thresholds and leader-based clustering approach
 * - `getGenericAlertFeatureVector` - Converts alert content into numerical feature
 *   vectors using n-gram hashing
 * - `cosineDistance` - Cosine distance calculation for vector similarity
 * - `clusterLLM` - LLM-based alert comparison with security-specific prompts
 * - `generateMatchPattern` - Automatic wildcard pattern creation from clustered alerts
 *
 * Ported from https://github.com/elastic/alert-clustering
 */

// Types
export type {
  AlertDocument,
  EnrichedAlert,
  EntityStats,
  ExceptionPattern,
  LLMComparisonResult,
  HybridClusteringConfig,
  ClusteringMetrics,
  LLMInvokeFn,
} from './types';

export {
  RULE_FIELDS,
  UNIQUE_FIELD,
  LOW_QUALITY_ENTITIES,
  ENTITY_FIELDS,
  TRIAGE_FIELDS,
} from './types';

// HybridClustering engine
export { HybridClustering } from './hybrid_clustering';

// Vectorization
export {
  getHash,
  getNgrams,
  vectorFromVal,
  getFieldsFromAlert,
  getGenericAlertFeatureVector,
  cosineDistance,
} from './vectorization';

// Utilities
export {
  getVal,
  getRuleName,
  getEntityStats,
  updateEntityStats,
  displayAlert,
  pruneLargeValues,
  cleanupAlertFields,
  groupByDistinctValue,
} from './utils';

// Pattern generation
export {
  wildmatch,
  exceptionlistMatch,
  longestCommonSubstring,
  generateMatchPattern,
} from './pattern_generation';

// LLM comparison
export {
  clusterLLM,
  neighborsLLM,
  getPromptHeader,
  getPromptBody,
  getPromptFooter,
} from './llm_comparison';

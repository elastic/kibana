/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// All shared types now live in @kbn/siem-readiness-common.
// Re-exported here for backward compatibility.
export type {
  IndexInfo,
  MainCategories,
  CategoryGroup,
  CategoriesResponse,
  DataQualityResultDocument,
  RelatedIntegrationRuleResponse,
  RelatedIntegration,
  SiemReadinessPackageInfo,
  PipelineStats,
  CasesSearchResponse,
  RetentionType,
  RetentionStatus,
  RetentionInfo,
  PipelineVolumeStats,
  CompiledPipeline,
  CompiledContinuityData,
  CompiledRetentionIndex,
  CompiledRetentionData,
  CompiledQualityIndex,
  CompiledQualityData,
  CompiledCategoryData,
  CompiledCoverageData,
} from '@kbn/siem-readiness-common';

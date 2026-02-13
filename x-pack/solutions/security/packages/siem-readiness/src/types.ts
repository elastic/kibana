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
  related_integrations?: Array<RelatedIntegration>;
  enabled: boolean;
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
}

export interface PipelineStats {
  name: string;
  indices: string[];
  docsCount: number;
  failedDocsCount: number;
}
export interface CasesSearchResponse {
  total: number;
  countOpenCases: number;
  countClosedCases: number;
  countInProgressCases: number;
}

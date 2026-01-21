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

type MainCategories = 'Endpoint' | 'Identity' | 'Network' | 'Cloud' | 'Application/SaaS';

export interface CategoryGroup {
  category: MainCategories | string;
  indices: IndexInfo[];
}

export interface CategoriesResponse {
  rawCategoriesMap: CategoryGroup[];
  mainCategoriesMap: CategoryGroup[];
}

export interface IncompatibleFieldMappingItem {
  fieldName: string;
  expectedValue: string;
  actualValue: string;
  description: string;
}

export interface IncompatibleFieldValueItem {
  fieldName: string;
  expectedValues: string[];
  actualValues: Array<{ name: string; count: number }>;
  description: string;
}

export interface SameFamilyFieldItem {
  fieldName: string;
  expectedValue: string;
  actualValue: string;
  description: string;
}

export interface ResultDocument {
  batchId: string;
  indexName: string;
  isCheckAll: boolean;
  checkedAt: number;
  docsCount: number;
  totalFieldCount: number;
  ecsFieldCount: number;
  customFieldCount: number;
  incompatibleFieldCount: number;
  incompatibleFieldMappingItems: IncompatibleFieldMappingItem[];
  incompatibleFieldValueItems: IncompatibleFieldValueItem[];
  sameFamilyFieldCount: number;
  sameFamilyFields: string[];
  sameFamilyFieldItems: SameFamilyFieldItem[];
  unallowedMappingFields: string[];
  unallowedValueFields: string[];
  sizeInBytes: number;
  markdownComments: string[];
  ecsVersion: string;
  error: string | null;
  indexPattern?: string;
  checkedBy?: string;
  indexId?: string;
  ilmPhase?: string;
}

export interface RelatedIntegrationRuleResponse {
  related_integrations?: Array<{
    package: string;
    version?: string;
    integration?: string;
  }>;
}

export interface SiemReadinessPackageInfo {
  id: string;
  name: string;
  title: string;
  version: string;
  status: string;
}

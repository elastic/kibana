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

export interface CaseItem {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  tags: string[];
  owner: string;
  created_at: string;
  updated_at: string;
  assignees: Array<{
    uid: string;
  }>;
  category: string | null;
}

export interface CasesSearchResponse {
  cases: CaseItem[];
  page: number;
  per_page: number;
  total: number;
  countOpenCases: number;
  countClosedCases: number;
  countInProgressCases: number;
}

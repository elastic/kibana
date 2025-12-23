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

export interface FleetPackage {
  name: string;
  title: string;
  version: string;
  release: 'ga' | 'beta' | 'experimental';
  description: string;
  type: 'integration' | 'input';
  download: string;
  path: string;
  icons: Array<{
    src: string;
    path: string;
    title: string;
    size: string;
    type: string;
  }>;
  policy_templates: Array<{
    name: string;
    title: string;
    description: string;
    deployment_modes: Record<string, { enabled: boolean }>;
  }>;
  conditions?: {
    kibana?: {
      version: string;
    };
  };
  owner: {
    type: string;
    github: string;
  };
  categories: string[];
  signature_path?: string;
  data_streams: Array<{
    type: string;
    dataset: string;
    title: string;
  }>;
  id: string;
  status: 'installed' | 'not_installed';
  related_integrations?: Array<{
    package: string;
    version: string;
  }>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesIndexTemplateSummary,
  Metadata,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface LatestIndexConfig {
  findings: IndexConfig;
  vulnerabilities: IndexConfig;
}

export interface IndexConfig {
  indexName: string;
  indexPattern: string;
  indexTemplateName: string;
  indexDefaultName: string;
}

export interface IndexTemplateParams {
  template: IndicesIndexTemplateSummary | undefined;
  composedOf: string[];
  _meta: Metadata | undefined;
  indexTemplateName: string;
  indexPattern: string;
}

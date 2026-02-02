/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinks } from '@kbn/doc-links';

class SearchIndicesDocLinks {
  public apiReference: string = '';
  public searchAPIReference: string = '';
  public setupSemanticSearch: string = '';
  public analyzeLogs: string = '';
  public elasticInferenceService: string = '';
  public elasticInferenceServicePricing: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.apiReference = newDocLinks.apiReference;
    this.setupSemanticSearch = newDocLinks.enterpriseSearch.semanticSearch;
    this.analyzeLogs = newDocLinks.serverlessSearch.integrations;
    this.searchAPIReference = newDocLinks.query.queryDsl;
    this.elasticInferenceService = newDocLinks.elasticsearch.elasticInferenceService;
    this.elasticInferenceServicePricing = newDocLinks.elasticsearch.elasticInferenceServicePricing;
  }
}
export const docLinks = new SearchIndicesDocLinks();

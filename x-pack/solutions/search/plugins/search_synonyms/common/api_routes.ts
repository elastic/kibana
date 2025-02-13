/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ROUTE_ROOT = '/app/elasticsearch/synonyms';

export enum APIRoutes {
  SYNONYM_SETS = '/internal/search_synonyms/synonyms',
  SYNONYM_SET_ID = '/internal/search_synonyms/synonyms/{synonymsSetId}',
  SYNONYM_SET_ID_RULE_ID = '/internal/search_synonyms/synonyms/{synonymsSetId}/{ruleId}',
  GENERATE_SYNONYM_RULE_ID = '/internal/search_synonyms/synonyms/{synonymsSetId}/generate',
}

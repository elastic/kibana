/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetResponse,
  IndicesGetMappingResponse,
  QueryRulesQueryRule,
  QueryRulesQueryRuleCriteria,
  QueryRulesQueryRuleset,
} from '@elastic/elasticsearch/lib/api/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchQueryRulesPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchQueryRulesPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppPluginSetupDependencies {}

export interface SearchQueryRulesConfigType {
  enabled: boolean;
}

// Normalized QueryRule types for easier UI handling
export type SearchQueryRulesQueryRule = Omit<QueryRulesQueryRule, 'criteria'> & {
  criteria: QueryRulesQueryRuleCriteria[];
};

export type SearchQueryRulesQueryRuleset = Omit<QueryRulesQueryRuleset, 'rules'> & {
  rules: SearchQueryRulesQueryRule[];
};

export interface SearchQueryDocumentResponse {
  document: GetResponse<unknown>;
  mappings: IndicesGetMappingResponse;
}

export type QueryRuleEditorForm = Pick<
  SearchQueryRulesQueryRule,
  'criteria' | 'type' | 'actions'
> & {
  mode: 'create' | 'edit';
  isAlways: boolean;
  rulesetId: string;
  ruleId: string;
};

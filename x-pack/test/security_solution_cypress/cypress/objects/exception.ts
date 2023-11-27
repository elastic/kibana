/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ELASTICSEARCH_USERNAME } from '../env_var_names_constants';

export interface Exception {
  field: string;
  operator: string;
  values: string[];
}

export interface ExceptionList {
  description: string;
  list_id: string;
  name: string;
  namespace_type: 'single' | 'agnostic';
  tags: string[];
  type: 'detection' | 'endpoint';
}

export interface ExceptionListItem {
  description: string;
  list_id: string;
  item_id: string;
  name: string;
  namespace_type: 'single' | 'agnostic';
  tags: string[];
  type: 'simple';
  entries: Array<{ field: string; operator: string; type: string; value: string[] }>;
  expire_time?: string;
}

export interface RuleExceptionItem {
  description: string;
  name: string;
  type: 'simple';
  entries: Array<{ field: string; operator: string; type: string; value: string[] | string }>;
  expire_time: string | undefined;
}

export const getExceptionList = (): ExceptionList => ({
  description: 'Test exception list description',
  list_id: 'test_exception_list',
  name: 'Test exception list',
  namespace_type: 'single',
  tags: ['test tag'],
  type: 'detection',
});

export const getException = (): Exception => ({
  field: 'agent.name',
  operator: 'is',
  values: ['foo'],
});

export const expectedExportedExceptionList = (
  exceptionListResponse: Cypress.Response<ExceptionListSchema>
): string => {
  const jsonRule = exceptionListResponse.body;
  return `{"_version":"${jsonRule._version}","created_at":"${
    jsonRule.created_at
  }","created_by":"${Cypress.env(ELASTICSEARCH_USERNAME)}","description":"${
    jsonRule.description
  }","id":"${jsonRule.id}","immutable":false,"list_id":"${jsonRule.list_id}","name":"${
    jsonRule.name
  }","namespace_type":"single","os_types":[],"tags":[],"tie_breaker_id":"${
    jsonRule.tie_breaker_id
  }","type":"${jsonRule.type}","updated_at":"${jsonRule.updated_at}","updated_by":"${Cypress.env(
    ELASTICSEARCH_USERNAME
  )}","version":1}\n{"exported_exception_list_count":1,"exported_exception_list_item_count":0,"missing_exception_list_item_count":0,"missing_exception_list_items":[],"missing_exception_lists":[],"missing_exception_lists_count":0}\n`;
};

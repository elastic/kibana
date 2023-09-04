/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionList, ExceptionListItem, RuleExceptionItem } from '../../objects/exception';
import { rootRequest } from '../common';

export const createEndpointExceptionList = <T = unknown>() =>
  rootRequest<T>({
    method: 'POST',
    url: '/api/endpoint_list',
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    failOnStatusCode: false,
  });

export const createExceptionList = (
  exceptionList: ExceptionList,
  exceptionListId = 'exception_list_testing'
) =>
  rootRequest<ExceptionListSchema>({
    method: 'POST',
    url: 'api/exception_lists',
    body: {
      list_id: exceptionListId != null ? exceptionListId : exceptionList.list_id,
      description: exceptionList.description,
      name: exceptionList.name,
      type: exceptionList.type,
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    failOnStatusCode: false,
  });

export const createExceptionListItem = (
  exceptionListId: string,
  exceptionListItem?: ExceptionListItem
) =>
  rootRequest<ExceptionListItemSchema>({
    method: 'POST',
    url: '/api/exception_lists/items',
    body: {
      list_id: exceptionListItem?.list_id ?? exceptionListId,
      item_id: exceptionListItem?.item_id ?? 'simple_list_item',
      tags: exceptionListItem?.tags ?? ['user added string for a tag', 'malware'],
      type: exceptionListItem?.type ?? 'simple',
      description: exceptionListItem?.description ?? 'This is a sample endpoint type exception',
      name: exceptionListItem?.name ?? 'Sample Exception List Item',
      entries: exceptionListItem?.entries ?? [
        {
          field: 'actingProcess.file.signer',
          operator: 'excluded',
          type: 'exists',
        },
        {
          field: 'host.name',
          operator: 'included',
          type: 'match_any',
          value: ['some host', 'another host'],
        },
      ],
      expire_time: exceptionListItem?.expire_time,
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    failOnStatusCode: false,
  });

export const createRuleExceptionItem = (ruleId: string, exceptionListItems: RuleExceptionItem[]) =>
  rootRequest({
    method: 'POST',
    url: `/api/detection_engine/rules/${ruleId}/exceptions`,
    body: {
      items: exceptionListItems,
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    failOnStatusCode: false,
  });

export const updateExceptionListItem = (
  exceptionListItemId: string,
  exceptionListItemUpdate?: Partial<ExceptionListItem>
) =>
  rootRequest({
    method: 'PUT',
    url: '/api/exception_lists/items',
    body: {
      item_id: exceptionListItemId,
      ...exceptionListItemUpdate,
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    failOnStatusCode: false,
  });

export const deleteExceptionList = (listId: string, namespaceType: string) =>
  rootRequest({
    method: 'DELETE',
    url: `/api/exception_lists?list_id=${listId}&namespace_type=${namespaceType}`,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    failOnStatusCode: false,
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateEndpointListItemResponse } from '@kbn/securitysolution-endpoint-exceptions-common/api';
import type {
  ExceptionListSchema,
  ExceptionListItemSchema,
  CreateEndpointListItemSchema,
  FoundAllListItemsSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ITEM_URL, ENDPOINT_LIST_URL } from '@kbn/securitysolution-list-constants';
import type { ExceptionList, ExceptionListItem, RuleExceptionItem } from '../../objects/exception';
import { rootRequest } from './common';

export const createEndpointExceptionList = () =>
  rootRequest<ExceptionListSchema>({
    method: 'POST',
    url: ENDPOINT_LIST_URL,
  });

export const createEndpointExceptionListItem = (item: CreateEndpointListItemSchema) =>
  rootRequest<CreateEndpointListItemResponse>({
    method: 'POST',
    url: ENDPOINT_LIST_ITEM_URL,
    body: item,
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
    failOnStatusCode: false,
  });

export const createExceptionListItem = (
  exceptionListId: string,
  exceptionListItem?: Partial<ExceptionListItem>
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
    failOnStatusCode: false,
  });

export const createRuleExceptionItem = (ruleId: string, exceptionListItems: RuleExceptionItem[]) =>
  rootRequest({
    method: 'POST',
    url: `/api/detection_engine/rules/${ruleId}/exceptions`,
    body: {
      items: exceptionListItems,
    },
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
    failOnStatusCode: false,
  });

export const deleteExceptionList = (listId: string, namespaceType: string = 'default') =>
  rootRequest({
    method: 'DELETE',
    url: `/api/exception_lists?list_id=${listId}&namespace_type=${namespaceType}`,
    failOnStatusCode: false,
  });

export const getExceptionLists = () =>
  rootRequest<FoundAllListItemsSchema>({
    method: 'GET',
    url: 'api/exception_lists/_find',
  });

export const deleteExceptionLists = () => {
  getExceptionLists().then(($lists) => {
    const listsIds = $lists.body.data.map((list) => {
      return list.list_id;
    });
    listsIds.forEach((id) => {
      deleteExceptionList(id, 'single');
    });
  });
};

export const deleteEndpointExceptionList = () => {
  deleteExceptionList('endpoint_list', 'agnostic');
};

export const linkRulesToExceptionList = (
  ruleId: string,
  exceptionList: {
    id: string;
    listId: string;
  }
) => {
  rootRequest({
    method: 'PATCH',
    url: `/api/detection_engine/rules`,
    body: {
      exceptions_list: [
        {
          id: exceptionList.id,
          list_id: exceptionList.listId,
          namespace_type: 'single',
          type: 'detection',
        },
      ],
      rule_id: ruleId,
    },
  });
};

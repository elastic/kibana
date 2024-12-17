/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemEntry } from '@kbn/securitysolution-exceptions-common/api';
import type {
  CreateRuleExceptionListItemsProps,
  Client as ExceptionsClient,
} from '@kbn/securitysolution-exceptions-common/api/quickstart_client.gen';
import type { ListType } from '@kbn/securitysolution-lists-common/api';
import type { Client as ListsClient } from '@kbn/securitysolution-lists-common/api/quickstart_client.gen';
import { importListItemsWrapper } from '../lists';

export const getMatchEntry: () => ExceptionListItemEntry = () => ({
  type: 'match',
  field: 'host.name',
  value: 'host-1',
  operator: 'included',
});

export const buildCreateRuleExceptionListItemsProps: (props: {
  id: string;
}) => CreateRuleExceptionListItemsProps = ({ id }) => ({
  params: { id },
  body: {
    items: [
      {
        description: 'test',
        type: 'simple',
        name: 'test',
        entries: [
          {
            type: 'match',
            field: 'test',
            value: 'test',
            operator: 'included',
          },
        ],
      },
    ],
  },
});

export const buildListExceptionListItemsProps: (props: {
  id: string;
  listId: string;
  listType: ListType;
}) => CreateRuleExceptionListItemsProps = ({ id, listId, listType }) => ({
  params: { id },
  body: {
    items: [
      {
        description: 'test',
        type: 'simple',
        name: 'test',
        entries: [
          {
            type: 'list',
            field: 'test',
            operator: 'included',
            list: {
              id: listId,
              type: listType,
            },
          },
        ],
      },
    ],
  },
});

export const createValueListException = async ({
  listItems,
  listName = 'myList',
  listType = 'keyword',
  exceptionListId,
  exceptionsClient,
  listsClient,
}: {
  listItems: string[];
  listName: string;
  listType: ListType;
  exceptionListId: string;
  exceptionsClient: ExceptionsClient;
  listsClient: ListsClient;
}) => {
  await importListItemsWrapper({
    listsClient,
    listName,
    listFileType: 'txt',
    listType,
    listItems,
  });

  await exceptionsClient.createExceptionListItem({
    body: {
      description: 'test',
      list_id: exceptionListId,
      type: 'simple',
      name: 'test item',
      entries: [
        {
          type: 'list',
          field: 'host.name',
          list: {
            id: `${listName}.txt`,
            type: listType,
          },
          operator: 'included',
        },
      ],
    },
  });
};

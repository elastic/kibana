/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { ListItemArraySchema, Type } from '@kbn/securitysolution-io-ts-list-types';

import {
  TransformElasticToListItemOptions,
  getQueryFilterFromTypeValue,
  transformElasticToListItem,
} from '../utils';
import { SearchEsListItemSchema } from '../../schemas/elastic_response';

export interface GetListItemByValuesOptions {
  listId: string;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  type: Type;
  value: string[];
}

export const getListItemByValues = async ({
  listId,
  esClient,
  listItemIndex,
  type,
  value,
}: GetListItemByValuesOptions): Promise<ListItemArraySchema> => {
  // TODO: Will need to address this when we switch over to
  // using PIT, don't want it to get lost
  // https://github.com/elastic/kibana/issues/103944
  const response = await esClient.search<SearchEsListItemSchema>({
    body: {
      query: {
        bool: {
          filter: getQueryFilterFromTypeValue({ listId, type, value }),
        },
      },
    },
    ignore_unavailable: true,
    index: listItemIndex,
    size: 10000, // TODO: This has a limit on the number which is 10,000 the default of Elastic but we might want to provide a way to increase that number
  });
  return transformElasticToListItem({
    response,
    type,
  } as unknown as TransformElasticToListItemOptions);
};

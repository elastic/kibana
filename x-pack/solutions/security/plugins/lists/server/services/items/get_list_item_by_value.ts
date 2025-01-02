/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { ListItemArraySchema, Type } from '@kbn/securitysolution-io-ts-list-types';

import { getListItemByValues } from '.';

export interface GetListItemByValueOptions {
  listId: string;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  type: Type;
  value: string;
}

export const getListItemByValue = async ({
  listId,
  esClient,
  listItemIndex,
  type,
  value,
}: GetListItemByValueOptions): Promise<ListItemArraySchema> =>
  getListItemByValues({
    esClient,
    listId,
    listItemIndex,
    type,
    value: [value],
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { LIST_ID, LIST_INDEX, LIST_ITEM_INDEX } from '../../../common/constants.mock';
import { getShardMock } from '../../schemas/common/get_shard.mock';

import { FindAllListItemsOptions } from './find_all_list_items';

export const getFindCount = (): Promise<estypes.CountResponse> => {
  return Promise.resolve({
    _shards: getShardMock(),
    count: 1,
  });
};

export const getFindAllListItemsOptionsMock = (): FindAllListItemsOptions => {
  return {
    esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
    filter: '',
    listId: LIST_ID,
    listIndex: LIST_INDEX,
    listItemIndex: LIST_ITEM_INDEX,
    sortField: undefined,
    sortOrder: undefined,
  };
};

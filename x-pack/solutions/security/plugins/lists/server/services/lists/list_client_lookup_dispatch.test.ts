/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  IMPORT_BUFFER_SIZE,
  IMPORT_TIMEOUT,
  LIST_INDEX,
  LIST_ITEM_INDEX,
  MAX_IMPORT_PAYLOAD_BYTES,
  MAX_IMPORT_SIZE,
} from '../../../common/constants.mock';
import {
  getEmptySearchListMock,
  getSearchEsListMock,
  getSearchListMock,
} from '../../schemas/elastic_response/search_es_list_schema.mock';
import type { SearchEsListSchema } from '../../schemas/elastic_response';

import { ListClient } from './list_client';

const LOOKUP_INDEX = '.value-list-v2-default-my-list';
const LOOKUP_ALIAS = '.items-default-my-list';

const lookupListSource = (): SearchEsListSchema =>
  ({
    ...getSearchEsListMock(),
    storage: { locator: { alias: LOOKUP_ALIAS, index: LOOKUP_INDEX }, type: 'lookup_index' },
    type: 'ip',
  } as SearchEsListSchema);

const legacyListSource = (): SearchEsListSchema => ({ ...getSearchEsListMock(), type: 'ip' });

/**
 * The storage a list uses is decided by its stored descriptor, not by the feature flag:
 * a lookup list created while the flag was on keeps reading and writing its own index
 * after the flag is turned off. The flag only decides the storage of new lists.
 */
describe('ListClient storage dispatch with the lookup flag off', () => {
  const build = (): {
    client: ListClient;
    search: jest.Mock;
  } => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    const client = new ListClient({
      config: {
        enableLookupIndices: false,
        importBufferSize: IMPORT_BUFFER_SIZE,
        importTimeout: IMPORT_TIMEOUT,
        listIndex: LIST_INDEX,
        listItemIndex: LIST_ITEM_INDEX,
        maxExceptionsImportSize: MAX_IMPORT_SIZE,
        maxImportPayloadBytes: MAX_IMPORT_PAYLOAD_BYTES,
      },
      esClient,
      spaceId: 'default',
      user: 'elastic',
    });
    return { client, search: esClient.search as unknown as jest.Mock };
  };

  it('reads a lookup list through the index recorded in its storage descriptor', async () => {
    const { client, search } = build();
    search
      .mockResolvedValueOnce(getSearchListMock(lookupListSource())) // getList
      .mockResolvedValueOnce(getEmptySearchListMock()); // membership search on the list's index

    await client.getListItemByValue({ listId: 'my-list', type: 'ip', value: '1.2.3.4' });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1][0]).toEqual(expect.objectContaining({ index: LOOKUP_ALIAS }));
  });

  it('reads a legacy list from the shared items stream', async () => {
    const { client, search } = build();
    search
      .mockResolvedValueOnce(getSearchListMock(legacyListSource())) // getList
      .mockResolvedValueOnce(getEmptySearchListMock()); // membership search on the shared stream

    await client.getListItemByValue({ listId: 'my-list', type: 'ip', value: '1.2.3.4' });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1][0]).toEqual(
      expect.objectContaining({ index: `${LIST_ITEM_INDEX}-default` })
    );
  });
});

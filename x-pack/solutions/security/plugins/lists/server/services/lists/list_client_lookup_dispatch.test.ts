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
import { LIST_ID } from '../../../common/constants.mock';
import {
  getEmptySearchListMock,
  getSearchEsListMock,
  getSearchListMock,
} from '../../schemas/elastic_response/search_es_list_schema.mock';
import type { SearchEsListSchema } from '../../schemas/elastic_response';

import { ListClient } from './list_client';

// the mock list document's id is LIST_ID; the names a list derives are built from it
const SPACE = 'default';
const LOOKUP_INDEX = `.value-list-v2-${SPACE}-${LIST_ID}`;
const LOOKUP_ALIAS = `${LIST_ITEM_INDEX}-${SPACE}-${LIST_ID}`;

// `alias: null` builds a restricted list (no alias); omitting it builds a shared one
const lookupListSource = (
  index = LOOKUP_INDEX,
  alias: string | null = LOOKUP_ALIAS
): SearchEsListSchema =>
  ({
    ...getSearchEsListMock(),
    storage: {
      locator: alias != null ? { alias, index } : { index },
      type: 'lookup_index',
    },
    type: 'ip',
  } as SearchEsListSchema);

const legacyListSource = (): SearchEsListSchema => ({ ...getSearchEsListMock(), type: 'ip' });

const build = (): {
  client: ListClient;
  internal: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  search: jest.Mock;
  hasPrivileges: jest.Mock;
} => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const internal = elasticsearchClientMock.createElasticsearchClient();
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
    internalEsClient: internal,
    spaceId: SPACE,
    user: 'elastic',
  });
  return {
    client,
    hasPrivileges: esClient.security.hasPrivileges as unknown as jest.Mock,
    internal,
    search: esClient.search as unknown as jest.Mock,
  };
};

/**
 * The storage a list uses is decided by its stored descriptor, not by the feature flag:
 * a lookup list created while the flag was on keeps reading and writing its own index
 * after the flag is turned off. The flag only decides the storage of new lists.
 */
describe('ListClient storage dispatch with the lookup flag off', () => {
  it('reads a lookup list through the index recorded in its storage descriptor', async () => {
    const { client, search } = build();
    search
      .mockResolvedValueOnce(getSearchListMock(lookupListSource())) // getList
      .mockResolvedValueOnce(getEmptySearchListMock()); // membership search on the list's index

    await client.getListItemByValue({ listId: LIST_ID, type: 'ip', value: '1.2.3.4' });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1][0]).toEqual(expect.objectContaining({ index: LOOKUP_ALIAS }));
  });

  it('reads a legacy list from the shared items stream', async () => {
    const { client, search } = build();
    search
      .mockResolvedValueOnce(getSearchListMock(legacyListSource())) // getList
      .mockResolvedValueOnce(getEmptySearchListMock()); // membership search on the shared stream

    await client.getListItemByValue({ listId: LIST_ID, type: 'ip', value: '1.2.3.4' });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1][0]).toEqual(
      expect.objectContaining({ index: `${LIST_ITEM_INDEX}-${SPACE}` })
    );
  });
});

/**
 * The descriptor is derived data. A list user holds Elasticsearch write on the container
 * and can set it by hand; a descriptor naming any index other than the one this space
 * derives from the list id is refused on every read, so no path hands a foreign name to
 * the internal client.
 */
describe('ListClient refuses a forged storage descriptor', () => {
  it.each([
    ["another space's index", '.value-list-v2-other-space-my-list', null],
    ["another list's index", `.value-list-v2-${SPACE}-other-list`, null],
    ['a system index', '.kibana', null],
    ["another list's alias", LOOKUP_INDEX, `${LIST_ITEM_INDEX}-${SPACE}-other-list`],
  ])('getList throws for a descriptor naming %s', async (_label, index, alias) => {
    const { client, search } = build();
    search.mockResolvedValueOnce(getSearchListMock(lookupListSource(index, alias)));

    await expect(client.getList({ id: LIST_ID })).rejects.toThrow(
      'was not written by the lists plugin'
    );
  });

  it('deleteList never reaches the internal client for a forged descriptor', async () => {
    const { client, internal, search } = build();
    search.mockResolvedValueOnce(getSearchListMock(lookupListSource('.kibana', null)));

    await expect(client.deleteList({ id: LIST_ID })).rejects.toThrow(
      'was not written by the lists plugin'
    );
    expect(internal.indices.delete).not.toHaveBeenCalled();
  });
});

/**
 * Restricting a list is an Elasticsearch boundary. The two operations that undo it,
 * un-restrict and delete, require the caller to read the list through its access name,
 * so a list writer without read on a restricted index can neither open nor destroy it.
 */
describe('ListClient privilege checks on restricted lists', () => {
  const restricted = (): SearchEsListSchema => lookupListSource(LOOKUP_INDEX, null);

  it('unrestrictList refuses a caller who cannot read the restricted index', async () => {
    const { client, internal, search, hasPrivileges } = build();
    search.mockResolvedValueOnce(getSearchListMock(restricted()));
    hasPrivileges.mockResolvedValueOnce({ has_all_requested: false });

    await expect(client.unrestrictList({ id: LIST_ID })).rejects.toMatchObject({
      message: expect.stringContaining('is restricted to roles that can read'),
      statusCode: 403,
    });
    expect(hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: [LOOKUP_INDEX], privileges: ['read'] }],
    });
    expect(internal.indices.updateAliases).not.toHaveBeenCalled();
  });

  it('deleteList refuses a caller who cannot read the restricted index', async () => {
    const { client, internal, search, hasPrivileges } = build();
    search.mockResolvedValueOnce(getSearchListMock(restricted()));
    hasPrivileges.mockResolvedValueOnce({ has_all_requested: false });

    await expect(client.deleteList({ id: LIST_ID })).rejects.toMatchObject({ statusCode: 403 });
    expect(internal.indices.delete).not.toHaveBeenCalled();
  });

  it('deleteList checks a shared list through its alias, which every list role can read', async () => {
    const { client, internal, search, hasPrivileges } = build();
    search
      .mockResolvedValueOnce(getSearchListMock(lookupListSource())) // getList
      .mockResolvedValueOnce(getEmptySearchListMock()); // the container delete's own search
    hasPrivileges.mockResolvedValueOnce({ has_all_requested: true });

    await client.deleteList({ id: LIST_ID }).catch(() => undefined);

    expect(hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: [LOOKUP_ALIAS], privileges: ['read'] }],
    });
    expect(internal.indices.delete).toHaveBeenCalledWith({ index: LOOKUP_INDEX });
  });

  it('assertCanDeleteList lets the delete route refuse before it strips exception references', async () => {
    const { client, search, hasPrivileges } = build();
    search.mockResolvedValueOnce(getSearchListMock(restricted()));
    hasPrivileges.mockResolvedValueOnce({ has_all_requested: false });

    await expect(client.assertCanDeleteList({ id: LIST_ID })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('assertCanDeleteList passes for a legacy list and for a missing list', async () => {
    const { client, search, hasPrivileges } = build();
    search
      .mockResolvedValueOnce(getSearchListMock(legacyListSource()))
      .mockResolvedValueOnce(getEmptySearchListMock());

    await expect(client.assertCanDeleteList({ id: LIST_ID })).resolves.toBeUndefined();
    await expect(client.assertCanDeleteList({ id: 'missing' })).resolves.toBeUndefined();
    expect(hasPrivileges).not.toHaveBeenCalled();
  });
});

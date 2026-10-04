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
  LIST_ID,
  LIST_INDEX,
  LIST_ITEM_INDEX,
  MAX_IMPORT_PAYLOAD_BYTES,
  MAX_IMPORT_SIZE,
} from '../../../common/constants.mock';
import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';
import type { ListSchema } from '../../../common/api';
import {
  deleteAuthoredLookupItem,
  deleteLookupItemByValue,
  findListByLookupIndex,
  locateLookupItem,
  writeLookupItems,
} from '../lookup';

import { ListClient } from './list_client';

jest.mock('../lookup', () => ({
  ...jest.requireActual('../lookup'),
  deleteAuthoredLookupItem: jest.fn(),
  deleteLookupItemByValue: jest.fn(),
  ensureLookupIndexCurrent: jest.fn(),
  findListByLookupIndex: jest.fn(),
  locateLookupItem: jest.fn(),
  writeLookupItems: jest.fn(),
}));

const SPACE = 'default';
const LOOKUP_INDEX = `.value-list-v2-${SPACE}-${LIST_ID}`;
const LOOKUP_ALIAS = `${LIST_ITEM_INDEX}-${SPACE}-${LIST_ID}`;
const OLD_RANGE = '10.0.0.0-10.0.0.100';
const NEW_RANGE = '10.0.1.0-10.0.1.10';
const ITEM_ID = 'src:0000000000000000000000000000000000000000000000000000000000000000';
const STAMPS = {
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: 'elastic',
  updated_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'elastic',
};

const rangeList = (): ListSchema => ({
  ...getListResponseMock(),
  storage: { locator: { alias: LOOKUP_ALIAS, index: LOOKUP_INDEX }, type: 'lookup_index' },
  type: 'ip_range',
});

const build = (): { client: ListClient; scheduleCoalesceRebuild: jest.Mock } => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  (esClient.get as unknown as jest.Mock).mockResolvedValue({ _source: STAMPS });
  const scheduleCoalesceRebuild = jest.fn();
  const client = new ListClient({
    config: {
      enableLookupIndices: true,
      importBufferSize: IMPORT_BUFFER_SIZE,
      importTimeout: IMPORT_TIMEOUT,
      listIndex: LIST_INDEX,
      listItemIndex: LIST_ITEM_INDEX,
      maxExceptionsImportSize: MAX_IMPORT_SIZE,
      maxImportPayloadBytes: MAX_IMPORT_PAYLOAD_BYTES,
    },
    esClient,
    internalEsClient: elasticsearchClientMock.createElasticsearchClient(),
    scheduleCoalesceRebuild,
    spaceId: SPACE,
    user: 'elastic',
  });
  return { client, scheduleCoalesceRebuild };
};

/**
 * An item id on a range list resolves to a range string. The by-id paths must remove
 * that document by its id: handing the range string to the delete by value would make
 * Elasticsearch look for it as an address on the range field and reject the request,
 * which is what a PUT on a range item did before the two deletes were separated.
 */
describe('ListClient by-id paths on a lookup range list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (locateLookupItem as jest.Mock).mockResolvedValue({
      index: LOOKUP_INDEX,
      stamps: STAMPS,
      value: OLD_RANGE,
    });
    (findListByLookupIndex as jest.Mock).mockResolvedValue(rangeList());
    (deleteAuthoredLookupItem as jest.Mock).mockResolvedValue([]);
    (writeLookupItems as jest.Mock).mockResolvedValue({ count: 0, sample: [] });
  });

  it('updateListItem writes the new range, then removes the old one as the document it names', async () => {
    const { client, scheduleCoalesceRebuild } = build();

    const item = await client.updateListItem({
      _version: undefined,
      id: ITEM_ID,
      meta: undefined,
      value: NEW_RANGE,
    });

    expect(writeLookupItems).toHaveBeenCalledWith(
      expect.objectContaining({
        index: LOOKUP_ALIAS,
        listId: LIST_ID,
        type: 'ip_range',
        values: [NEW_RANGE],
      })
    );
    expect(deleteAuthoredLookupItem).toHaveBeenCalledWith(
      expect.objectContaining({
        index: LOOKUP_ALIAS,
        listId: LIST_ID,
        type: 'ip_range',
        value: OLD_RANGE,
      })
    );
    expect(deleteLookupItemByValue).not.toHaveBeenCalled();
    expect(scheduleCoalesceRebuild).toHaveBeenCalledWith({ index: LOOKUP_INDEX, type: 'ip_range' });
    expect(item?.value).toBe(NEW_RANGE);
    expect(item?.id).not.toBe(ITEM_ID);
  });

  it('deleteListItem removes the range the id names as a document and reports it', async () => {
    const { client, scheduleCoalesceRebuild } = build();

    const item = await client.deleteListItem({ id: ITEM_ID, refresh: false });

    expect(deleteAuthoredLookupItem).toHaveBeenCalledWith(
      expect.objectContaining({
        index: LOOKUP_ALIAS,
        listId: LIST_ID,
        type: 'ip_range',
        value: OLD_RANGE,
      })
    );
    expect(deleteLookupItemByValue).not.toHaveBeenCalled();
    expect(scheduleCoalesceRebuild).toHaveBeenCalledWith({ index: LOOKUP_INDEX, type: 'ip_range' });
    expect(item?.value).toBe(OLD_RANGE);
  });

  it('updateListItem with the same value changes nothing', async () => {
    const { client } = build();

    const item = await client.updateListItem({
      _version: undefined,
      id: ITEM_ID,
      meta: undefined,
      value: OLD_RANGE,
    });

    expect(writeLookupItems).not.toHaveBeenCalled();
    expect(deleteAuthoredLookupItem).not.toHaveBeenCalled();
    expect(item?.value).toBe(OLD_RANGE);
  });
});

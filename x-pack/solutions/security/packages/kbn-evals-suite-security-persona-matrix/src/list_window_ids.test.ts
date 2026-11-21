/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { listWindowIds } from './list_window_ids';

const WINDOW = { start: '2026-03-01T00:00:00.000Z', end: '2026-04-01T00:00:00.000Z' };

const pagedSearch = (pages: Array<Array<{ _id: string; sort: string[] }>>) => {
  const search = jest.fn().mockImplementationOnce(async () => ({ hits: { hits: pages[0] } }));
  for (let i = 1; i < pages.length; i++) {
    search.mockResolvedValueOnce({ hits: { hits: pages[i] } });
  }
  return search;
};

const clientWith = (search: jest.Mock, extras: Record<string, unknown> = {}) =>
  ({
    search,
    openPointInTime: jest.fn(async () => ({ id: 'pit-1' })),
    closePointInTime: jest.fn(async () => ({ succeeded: true })),
    ...extras,
  } as unknown as EsClient);

describe('listWindowIds', () => {
  it('pages the window with search_after and collects every _id', async () => {
    const search = pagedSearch([
      [
        { _id: 'a', sort: ['0'] },
        { _id: 'b', sort: ['1'] },
      ],
      [{ _id: 'c', sort: ['2'] }],
      [],
    ]);
    const ids = await listWindowIds(clientWith(search), 'idx', WINDOW);
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(search).toHaveBeenCalledTimes(3);
    // search_after must carry the previous page's last sort payload.
    expect(search.mock.calls[1][0]).toMatchObject({ search_after: ['1'] });
    expect(search.mock.calls[2][0]).toMatchObject({ search_after: ['2'] });
  });

  // Regression: sorting on `_id` throws on ES 8+
  // ("Fielddata access on the _id field is disallowed", fielddata on _id is
  // disabled by default), failing Attack Discovery setup on every run before
  // the data gate could execute. Paging must sort on `_shard_doc`, never `_id`.
  it('never sorts on _id (ES 8 disables _id fielddata)', async () => {
    const search = pagedSearch([[{ _id: 'a', sort: ['0'] }], []]);
    await listWindowIds(clientWith(search), 'idx', WINDOW);
    for (const [body] of search.mock.calls) {
      expect(JSON.stringify(body.sort)).not.toContain('_id"');
      expect(body.sort).toContain('_shard_doc');
    }
  });

  // Regression: ES only accepts a `_shard_doc`
  // sort inside a point-in-time search; without a PIT the request fails with
  // "[_shard_doc] sort field cannot be used without [point in time]". The
  // search must open a PIT, pass `pit` (not `index`), and close it afterwards.
  it('searches inside a PIT and closes it', async () => {
    const search = pagedSearch([[{ _id: 'a', sort: ['0'] }], []]);
    const client = clientWith(search);
    const openPointInTime = client.openPointInTime as jest.Mock;
    const closePointInTime = client.closePointInTime as jest.Mock;
    await listWindowIds(client, 'idx', WINDOW);
    expect(openPointInTime).toHaveBeenCalledWith({ index: 'idx', keep_alive: '2m' });
    for (const [body] of search.mock.calls) {
      expect(body).not.toHaveProperty('index');
      expect(body.pit).toMatchObject({ id: 'pit-1' });
      expect(body.sort).toContain('_shard_doc');
    }
    expect(closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
  });

  // Regression: ES can return a new PIT id on any search,
  // the final empty page included; the next page and the close must use the latest id.
  it('follows the pit_id each search returns, for paging and for the close', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce({ pit_id: 'pit-2', hits: { hits: [{ _id: 'a', sort: ['0'] }] } })
      .mockResolvedValueOnce({ pit_id: 'pit-3', hits: { hits: [] } });
    const client = clientWith(search);
    await listWindowIds(client, 'idx', WINDOW);
    expect(search.mock.calls[0][0].pit).toMatchObject({ id: 'pit-1' });
    expect(search.mock.calls[1][0].pit).toMatchObject({ id: 'pit-2' });
    expect(client.closePointInTime as jest.Mock).toHaveBeenCalledWith({ id: 'pit-3' });
  });

  it('closes the PIT even when a search page throws', async () => {
    const search = jest.fn().mockRejectedValueOnce(new Error('search failed'));
    const client = clientWith(search);
    await expect(listWindowIds(client, 'idx', WINDOW)).rejects.toThrow('search failed');
    expect(client.closePointInTime as jest.Mock).toHaveBeenCalledWith({ id: 'pit-1' });
  });

  it('throws instead of looping or returning a partial list when a page does not advance', async () => {
    const stuck = { _id: 'a', sort: ['0'] };
    const search = jest.fn(async () => ({ hits: { hits: [stuck] } }));
    const client = clientWith(search);
    await expect(listWindowIds(client, 'idx', WINDOW)).rejects.toThrow('stopped advancing');
    // First page + one repeat confirming the cursor is stuck, then fail.
    expect(search).toHaveBeenCalledTimes(2);
    expect(client.closePointInTime as jest.Mock).toHaveBeenCalledWith({ id: 'pit-1' });
  });

  it('throws when a hit carries no sort values', async () => {
    const search = jest.fn(async () => ({ hits: { hits: [{ _id: 'a' }] } }));
    await expect(listWindowIds(clientWith(search), 'idx', WINDOW)).rejects.toThrow(
      'stopped advancing'
    );
  });
});

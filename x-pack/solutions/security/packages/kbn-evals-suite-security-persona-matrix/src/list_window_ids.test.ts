/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with
 * the Elastic License 2.0, at your election.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { listWindowIds } from './list_window_ids';

const WINDOW = { start: '2026-03-01T00:00:00.000Z', end: '2026-04-01T00:00:00.000Z' };

const pagedSearch = (pages: Array<Array<{ _id: string; sort: string[] }>>) => {
  const search = jest
    .fn()
    .mockImplementationOnce(async () => ({ hits: { hits: pages[0] } }));
  for (let i = 1; i < pages.length; i++) {
    search.mockResolvedValueOnce({ hits: { hits: pages[i] } });
  }
  return search;
};

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
    const ids = await listWindowIds({ search } as unknown as EsClient, 'idx', WINDOW);
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(search).toHaveBeenCalledTimes(3);
    // search_after must carry the previous page's last sort payload.
    expect(search.mock.calls[1][0]).toMatchObject({ search_after: ['1'] });
    expect(search.mock.calls[2][0]).toMatchObject({ search_after: ['2'] });
  });

  // Regression (Libra PRRT_kwDOAHeGUM65T_t6): sorting on `_id` throws on ES 8+
  // ("Fielddata access on the _id field is disallowed", fielddata on _id is
  // disabled by default), failing Attack Discovery setup on every run before
  // the data gate could execute. Paging must sort on `_shard_doc`, never `_id`.
  it('never sorts on _id (ES 8 disables _id fielddata)', async () => {
    const search = pagedSearch([[{ _id: 'a', sort: ['0'] }], []]);
    await listWindowIds({ search } as unknown as EsClient, 'idx', WINDOW);
    for (const [body] of search.mock.calls) {
      expect(JSON.stringify(body.sort)).not.toContain('_id"');
      expect(body.sort).toContain('_shard_doc');
    }
  });

  it('stops instead of looping when a page does not advance', async () => {
    const stuck = { _id: 'a', sort: ['0'] };
    const search = jest.fn(async () => ({ hits: { hits: [stuck] } }));
    const ids = await listWindowIds({ search } as unknown as EsClient, 'idx', WINDOW);
    expect(ids).toEqual(['a']);
    // First page + one repeat confirming the cursor is stuck, then stop.
    expect(search.mock.calls.length).toBeLessThanOrEqual(3);
  });
});

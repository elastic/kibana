/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tagAlerts } from '../ports';
import { releaseMovedOn, undoClosedAlerts, untagStillOpen } from './alert_releases';

const TAG = 'az:closed_by_decision:fp-decision-0123456789abcdef';
const ID = 'fp-decision-0123456789abcdef';

const setup = ({ hits = [] as string[] }: { hits?: string[] } = {}) => {
  const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
    if (path.endsWith('/signals/search')) {
      return { status: 200, headers: {}, body: { hits: { hits: hits.map((_id) => ({ _id })) } } };
    }
    return { status: 200, headers: {}, body: { updated: hits.length, failures: [] } };
  });
  const api = { callKibanaApi };
  const writes = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/signals/tags'))
      .map(([{ body }]) => body as { ids: string[]; tags: { tags_to_remove: string[] } });
  return { api, callKibanaApi, write: tagAlerts(api), writes };
};

describe('untagStillOpen', () => {
  it('takes the tag off only the alerts that are still open, so a close that landed stays findable', async () => {
    const { api, write, writes } = setup({ hits: ['b'] });

    await untagStillOpen({ api, write, id: ID, alertIds: ['a', 'b'] });

    expect(writes()).toEqual([{ ids: ['b'], tags: { tags_to_add: [], tags_to_remove: [TAG] } }]);
  });

  it('does nothing for no alerts, and writes nothing when none is open', async () => {
    const empty = setup();
    await untagStillOpen({ api: empty.api, write: empty.write, id: ID, alertIds: [] });
    expect(empty.callKibanaApi).not.toHaveBeenCalled();

    const none = setup({ hits: [] });
    await untagStillOpen({ api: none.api, write: none.write, id: ID, alertIds: ['a'] });
    expect(none.writes()).toEqual([]);
  });

  it('throws when the read fails, and leaves the caller to decide', async () => {
    const api = { callKibanaApi: jest.fn().mockRejectedValue(new Error('es down')) };

    await expect(
      untagStillOpen({ api, write: tagAlerts(api), id: ID, alertIds: ['a'] })
    ).rejects.toThrow('es down');
  });
});

describe('releaseMovedOn', () => {
  it('takes the tag off the alerts that are not closed as a false positive and returns them', async () => {
    const { api, write, writes } = setup({ hits: ['b'] });

    const left = await releaseMovedOn({ api, write, id: ID, alertIds: ['a', 'b'] });

    expect(left).toEqual(['b']);
    expect(writes()).toEqual([{ ids: ['b'], tags: { tags_to_add: [], tags_to_remove: [TAG] } }]);
  });

  it('writes nothing when every alert was closed as a false positive', async () => {
    const { api, write, writes } = setup({ hits: [] });

    await expect(releaseMovedOn({ api, write, id: ID, alertIds: ['a'] })).resolves.toEqual([]);

    expect(writes()).toEqual([]);
  });

  it('throws when the read fails, because the notes must not claim a close that did not happen', async () => {
    const api = { callKibanaApi: jest.fn().mockRejectedValue(new Error('es down')) };

    await expect(
      releaseMovedOn({ api, write: tagAlerts(api), id: ID, alertIds: ['a'] })
    ).rejects.toThrow('es down');
  });
});

describe('undoClosedAlerts', () => {
  it('reopens the closed alerts, takes the tag off every tagged alert, and returns how many it reopened', async () => {
    const { api, callKibanaApi, write, writes } = setup({ hits: ['a'] });

    const reopened = await undoClosedAlerts({
      api,
      write,
      id: ID,
      tagged: ['a', 'b'],
      closedIds: ['a'],
    });

    expect(reopened).toBe(1);
    const reopen = callKibanaApi.mock.calls.find(([{ path }]) => path.endsWith('/signals/status'))!;
    expect(reopen[0].body).toEqual(expect.objectContaining({ status: 'open' }));
    expect(writes()).toEqual([
      { ids: ['a', 'b'], tags: { tags_to_add: [], tags_to_remove: [TAG] } },
    ]);
  });

  it('leaves the tag on when the reopen fails, so running the revoke again finds the alerts', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
      if (path.endsWith('/signals/status')) throw new Error('reopen failed');
      return { status: 200, headers: {}, body: { updated: 1, failures: [] } };
    });
    const api = { callKibanaApi };

    await expect(
      undoClosedAlerts({ api, write: tagAlerts(api), id: ID, tagged: ['a'], closedIds: ['a'] })
    ).rejects.toThrow('reopen failed');

    expect(callKibanaApi.mock.calls.some(([{ path }]) => path.endsWith('/signals/tags'))).toBe(
      false
    );
  });
});

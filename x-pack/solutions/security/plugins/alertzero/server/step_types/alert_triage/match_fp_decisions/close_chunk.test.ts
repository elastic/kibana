/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tagAlerts } from '../ports';
import { closeChunk } from './close_chunk';

const ID = 'fp-decision-0123456789abcdef';
const TAG = `az:closed_by_decision:${ID}`;

const setup = ({
  open,
  updated,
  timedOut = false,
}: {
  open: string[];
  updated: number;
  timedOut?: boolean;
}) => {
  const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
    if (path.endsWith('/signals/search')) {
      return { status: 200, headers: {}, body: { hits: { hits: open.map((_id) => ({ _id })) } } };
    }
    if (path.endsWith('/signals/status')) {
      return { status: 200, headers: {}, body: { updated, timed_out: timedOut, failures: [] } };
    }
    return { status: 200, headers: {}, body: { updated: 1, failures: [] } };
  });
  const api = { callKibanaApi };
  const callsTo = (suffix: string) =>
    callKibanaApi.mock.calls.filter(([{ path }]) => path.endsWith(suffix)).map(([call]) => call);
  return { api, callKibanaApi, write: tagAlerts(api), callsTo };
};

describe('closeChunk', () => {
  it('closes only the alerts that are still open, and lets the others go with their tag off', async () => {
    const { api, write, callsTo } = setup({ open: ['a'], updated: 1 });

    const result = await closeChunk({
      api,
      write,
      id: ID,
      chunk: ['a', 'b'],
      chargeAttempt: jest.fn(),
    });

    expect(result).toEqual({ attempted: ['a'], updated: 1, timedOut: false });
    expect(callsTo('/signals/tags').map(({ body }) => body)).toEqual([
      { ids: ['b'], tags: { tags_to_add: [], tags_to_remove: [TAG] } },
    ]);
    expect(callsTo('/signals/status')[0].body.query.bool.filter[0].ids.values).toEqual(['a']);
  });

  it('charges the attempt before the close is made, so a close that fails still counts', async () => {
    const { api, write, callKibanaApi } = setup({ open: ['a', 'b'], updated: 2 });
    const order: string[] = [];
    callKibanaApi.mockImplementationOnce(async () => ({
      status: 200,
      headers: {},
      body: { hits: { hits: [{ _id: 'a' }, { _id: 'b' }] } },
    }));
    const chargeAttempt = jest.fn(() => order.push('charge'));
    const inner = callKibanaApi.getMockImplementation()!;
    callKibanaApi.mockImplementation(async (params: { path: string }) => {
      if (params.path.endsWith('/signals/status')) order.push('close');
      return inner(params);
    });

    await closeChunk({ api, write, id: ID, chunk: ['a', 'b'], chargeAttempt });

    expect(chargeAttempt).toHaveBeenCalledWith(['a', 'b']);
    expect(order).toEqual(['charge', 'close']);
  });

  it('writes no close and charges nothing when no alert is open any more', async () => {
    const { api, write, callsTo } = setup({ open: [], updated: 0 });
    const chargeAttempt = jest.fn();

    const result = await closeChunk({ api, write, id: ID, chunk: ['a'], chargeAttempt });

    expect(result).toEqual({ attempted: [], updated: 0, timedOut: false });
    expect(chargeAttempt).not.toHaveBeenCalled();
    expect(callsTo('/signals/status')).toEqual([]);
  });

  it('reports a close that timed out part way', async () => {
    const { api, write } = setup({ open: ['a', 'b'], updated: 1, timedOut: true });

    const result = await closeChunk({
      api,
      write,
      id: ID,
      chunk: ['a', 'b'],
      chargeAttempt: jest.fn(),
    });

    expect(result).toEqual({ attempted: ['a', 'b'], updated: 1, timedOut: true });
  });
});

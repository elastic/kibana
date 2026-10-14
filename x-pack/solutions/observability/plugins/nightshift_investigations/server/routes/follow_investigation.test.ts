/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { firstValueFrom, toArray } from 'rxjs';
import type { Observable } from 'rxjs';
import type { InvestigationStatusEvent } from '../../common';
import { InvestigationNotFoundError } from '../client/errors';
import { followInvestigationRoute } from './follow_investigation';

const { handler } = followInvestigationRoute['GET /internal/nightshift/investigations/{id}/follow'];
const mockRequest = {} as KibanaRequest;

const makeState = (status: InvestigationStatusEvent['status']) => ({
  investigation_id: 'inv-1',
  status,
});

const makeResources = (get: jest.Mock) => ({
  request: mockRequest,
  params: { path: { id: 'inv-1' } },
  getInvestigationsClient: jest.fn().mockReturnValue({ get }),
});

describe('GET /internal/nightshift/investigations/{id}/follow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits the current state and the terminal state, then completes', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce(makeState('running'))
      .mockResolvedValueOnce(makeState('completed'));

    const events$ = (await handler(
      makeResources(get) as never
    )) as Observable<InvestigationStatusEvent>;
    const eventsPromise = firstValueFrom(events$.pipe(toArray()));

    await jest.advanceTimersByTimeAsync(2_000);

    await expect(eventsPromise).resolves.toEqual([
      { type: 'investigation_status', investigation_id: 'inv-1', status: 'running' },
      { type: 'investigation_status', investigation_id: 'inv-1', status: 'completed' },
    ]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('completes immediately for an already-terminal investigation', async () => {
    const get = jest.fn().mockResolvedValue(makeState('cancelled'));

    const events$ = (await handler(
      makeResources(get) as never
    )) as Observable<InvestigationStatusEvent>;
    await expect(firstValueFrom(events$.pipe(toArray()))).resolves.toEqual([
      { type: 'investigation_status', investigation_id: 'inv-1', status: 'cancelled' },
    ]);

    await jest.advanceTimersByTimeAsync(4_000);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('returns a not-found response before opening the stream', async () => {
    const get = jest.fn().mockRejectedValue(new InvestigationNotFoundError('inv-1'));

    await expect(handler(makeResources(get) as never)).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
  });
});

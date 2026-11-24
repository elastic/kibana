/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { createAppRootMockRenderer } from '../../test';
import { useFetchSessionViewProcessEvents } from './hooks';
import { PROCESS_EVENTS_PER_PAGE } from '../../../common/constants';
import type { ProcessEvent } from '../../../common';

const START = Date.parse('2022-05-10T20:00:00.000Z');

const getEvent = (kind: 'event' | 'signal', time: number): ProcessEvent =>
  ({
    '@timestamp': new Date(time).toISOString(),
    event: { kind, action: 'exec' },
  } as ProcessEvent);

describe('useFetchSessionViewProcessEvents', () => {
  it('takes the cursor of the next page from process events, not from alerts', async () => {
    const { coreStart, AppWrapper } = createAppRootMockRenderer();
    const lastProcessEvent = getEvent('event', START + PROCESS_EVENTS_PER_PAGE);
    // an alert has an exec action too and is raised after the process event that caused it, so its time is
    // later than the last process event of the page
    const alert = getEvent('signal', START + PROCESS_EVENTS_PER_PAGE + 5000);
    const processEvents = Array.from({ length: PROCESS_EVENTS_PER_PAGE - 1 }, (_, i) =>
      getEvent('event', START + i + 1)
    ).concat(lastProcessEvent);
    const get = coreStart.http.get as jest.Mock;

    get.mockResolvedValueOnce({
      total: PROCESS_EVENTS_PER_PAGE,
      events: [...processEvents, alert].map((_source) => ({ _source })),
    });
    get.mockResolvedValue({ total: PROCESS_EVENTS_PER_PAGE, events: [] });

    const { result } = renderHook(
      () => useFetchSessionViewProcessEvents('index', 'entity-id', '2022-05-10T00:00:00.000Z'),
      { wrapper: AppWrapper }
    );

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1].query).toEqual(
      expect.objectContaining({ cursor: lastProcessEvent['@timestamp'], forward: true })
    );
  });

  it('does not take a page with many alerts for a full page of process events', async () => {
    const { coreStart, AppWrapper } = createAppRootMockRenderer();
    const get = coreStart.http.get as jest.Mock;
    // the last page of the session holds few process events, but the alerts bring it over the page size
    const processEvents = Array.from({ length: 10 }, (_, i) => getEvent('event', START + i));
    const alerts = Array.from({ length: PROCESS_EVENTS_PER_PAGE }, (_, i) =>
      getEvent('signal', START + 1000 + i)
    );

    get.mockResolvedValue({
      total: processEvents.length,
      events: [...processEvents, ...alerts].map((_source) => ({ _source })),
    });

    const { result } = renderHook(
      () => useFetchSessionViewProcessEvents('index', 'entity-id', '2022-05-10T00:00:00.000Z'),
      { wrapper: AppWrapper }
    );

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));

    expect(result.current.hasNextPage).toBe(false);
  });

  it('requests the page before the opening alert with its time when the first page holds only alerts', async () => {
    const { coreStart, AppWrapper } = createAppRootMockRenderer();
    const get = coreStart.http.get as jest.Mock;
    const jumpToCursor = '2022-05-10T21:40:00.000Z';
    // Session View opened from the last alert of the session: no process event follows it. The alert has an
    // exec action, and its @timestamp (when it was raised) differs from the time that Session View opened at.
    const alert = getEvent('signal', Date.parse('2022-05-10T21:40:03.000Z'));

    get.mockResolvedValueOnce({ total: 0, events: [{ _source: alert }] });
    get.mockResolvedValue({ total: 0, events: [] });

    renderHook(
      () =>
        useFetchSessionViewProcessEvents(
          'index',
          'entity-id',
          '2022-05-10T00:00:00.000Z',
          jumpToCursor
        ),
      { wrapper: AppWrapper }
    );

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

    expect(get.mock.calls[1][1].query).toEqual(
      expect.objectContaining({ cursor: jumpToCursor, forward: false })
    );
  });
});

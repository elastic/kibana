/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  createInvestigationsReader as createReader,
  toInvestigationSummary as toSummary,
  type FakeInvestigation,
} from './investigations_reader.mock';
import {
  listInvestigationStateSets,
  resolveEventInvestigations,
} from './resolve_event_investigations';

const logger = loggingSystemMock.createLogger();
const request = {} as KibanaRequest;

describe('resolveEventInvestigations', () => {
  beforeEach(() => jest.clearAllMocks());

  const resolve = (
    reader: ReturnType<typeof createReader>['reader'] | undefined,
    episodeIds: Array<string | undefined>
  ) => resolveEventInvestigations({ agenticInvestigations: reader, request, episodeIds, logger });

  it('takes the open investigation of an episode over a newer closed one', async () => {
    const { reader } = createReader({
      investigations: [
        {
          id: 'closed-newer',
          open: false,
          updatedAt: '2026-11-04T12:00:00.000Z',
          alertIds: ['ep-1'],
        },
        {
          id: 'open-older',
          inProgress: true,
          updatedAt: '2026-11-04T09:00:00.000Z',
          alertIds: ['ep-1'],
        },
      ],
    });

    expect((await resolve(reader, ['ep-1'])).get('ep-1')).toEqual({
      state: 'in_progress',
      investigationId: 'open-older',
    });
  });

  it('falls back to the most recently updated investigation when none is open', async () => {
    const { reader } = createReader({
      investigations: [
        { id: 'older', open: false, updatedAt: '2026-11-04T08:00:00.000Z', alertIds: ['ep-1'] },
        { id: 'newer', open: false, updatedAt: '2026-11-04T11:00:00.000Z', alertIds: ['ep-1'] },
      ],
    });

    expect((await resolve(reader, ['ep-1'])).get('ep-1')).toEqual({
      state: 'completed',
      investigationId: 'newer',
    });
  });

  it('reads an episode with no investigation as not_started', async () => {
    const { reader } = createReader({ investigations: [{ id: 'other', alertIds: ['ep-2'] }] });

    expect((await resolve(reader, ['ep-1'])).get('ep-1')).toEqual({ state: 'not_started' });
  });

  it('ignores episodes without an id', async () => {
    const { reader, findConversationIdsBySubjects } = createReader({ investigations: [] });

    expect((await resolve(reader, [undefined, ''])).size).toBe(0);
    expect(findConversationIdsBySubjects).not.toHaveBeenCalled();
  });

  it('resolves an investigation that holds several alert subjects for each of their episodes', async () => {
    const { reader } = createReader({
      investigations: [{ id: 'shared', inProgress: true, alertIds: ['ep-1', 'ep-2'] }],
    });

    const result = await resolve(reader, ['ep-1', 'ep-2']);

    expect(result.get('ep-1')).toEqual({ state: 'in_progress', investigationId: 'shared' });
    expect(result.get('ep-2')).toEqual({ state: 'in_progress', investigationId: 'shared' });
  });

  it('ignores a conversation id that list does not return', async () => {
    const { reader, list } = createReader({
      investigations: [{ id: 'real', alertIds: ['ep-1'] }],
      unreadableIds: ['not-readable'],
    });

    const result = await resolve(reader, ['ep-1']);

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ id: ['real', 'not-readable'] }));
    expect(result.get('ep-1')).toEqual({ state: 'completed', investigationId: 'real' });
  });

  it('reads every episode as unknown when the plugin is unavailable', async () => {
    const result = await resolve(undefined, ['ep-1', 'ep-2']);

    expect(result.get('ep-1')).toEqual({ state: 'unknown' });
    expect(result.get('ep-2')).toEqual({ state: 'unknown' });
  });

  it('chunks the subject keys by 50 and the conversation ids by 100', async () => {
    const episodeIds = Array.from({ length: 120 }, (_, index) => `ep-${index}`);
    const { reader, findConversationIdsBySubjects, list } = createReader({
      investigations: episodeIds.map((episodeId, index) => ({
        id: `inv-${index}`,
        alertIds: [episodeId],
      })),
    });

    const result = await resolve(reader, episodeIds);

    expect(findConversationIdsBySubjects.mock.calls.map(([keys]) => keys.length)).toEqual([
      50, 50, 20,
    ]);
    expect(
      Math.max(...list.mock.calls.map(([query]) => query?.id?.length ?? 0))
    ).toBeLessThanOrEqual(100);
    expect(result.get('ep-119')).toEqual({ state: 'completed', investigationId: 'inv-119' });
  });

  it('reads only the episodes of a failing chunk as unknown', async () => {
    const episodeIds = Array.from({ length: 60 }, (_, index) => `ep-${index}`);
    const { reader } = createReader({
      investigations: episodeIds.map((id, index) => ({ id: `inv-${index}`, alertIds: [id] })),
      failSubjects: (keys) => keys.some(({ id }) => id === 'ep-55'),
    });

    const result = await resolve(reader, episodeIds);

    expect(result.get('ep-0')?.state).toBe('completed');
    expect(result.get('ep-55')).toEqual({ state: 'unknown' });
    expect(result.get('ep-59')).toEqual({ state: 'unknown' });
  });

  it('reads a refused list call as unknown, never not_started', async () => {
    const { reader } = createReader({
      investigations: [{ id: 'inv', alertIds: ['ep-1'] }],
      failList: true,
    });

    expect((await resolve(reader, ['ep-1'])).get('ep-1')).toEqual({ state: 'unknown' });
  });

  it('reads a chunk slower than five seconds as unknown', async () => {
    jest.useFakeTimers();
    try {
      const { reader } = createReader({ investigations: [], hangSubjects: true });

      const pending = resolve(reader, ['ep-1']);
      await jest.advanceTimersByTimeAsync(5_000);

      expect((await pending).get('ep-1')).toEqual({ state: 'unknown' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('listInvestigationStateSets', () => {
  const createLister = (pages: FakeInvestigation[][], total?: number) => {
    const list = jest.fn(async ({ page = 1 }: { page?: number } = {}) => ({
      results: (pages[page - 1] ?? []).map(toSummary),
      pagination: {
        page,
        per_page: 100,
        total: total ?? pages.flat().length,
      },
    }));
    return { list, reader: { getInvestigationsClient: () => ({ list }) } as never };
  };

  beforeEach(() => jest.clearAllMocks());

  it('is unavailable without the plugin', async () => {
    expect(await listInvestigationStateSets({ request, logger })).toBe('unavailable');
  });

  it('splits episodes into running and not running, taking an open investigation over a newer closed one', async () => {
    const { reader, list } = createLister([
      [
        { id: 'a', open: false, alertIds: ['ep-closed-then-open'] },
        { id: 'b', inProgress: true, alertIds: ['ep-running'] },
        { id: 'c', open: false, alertIds: ['ep-done'] },
        { id: 'd', open: true, inProgress: true, alertIds: ['ep-closed-then-open'] },
      ],
    ]);

    const sets = await listInvestigationStateSets({
      agenticInvestigations: reader,
      request,
      logger,
    });

    expect(sets).toEqual({
      inProgress: expect.arrayContaining(['ep-running', 'ep-closed-then-open']),
      completed: ['ep-done'],
      truncated: false,
    });
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        subject_type: 'alert',
        sort_field: 'created_at',
        sort_order: 'desc',
      })
    );
  });

  it('stops at 1,000 investigations and says the window was full', async () => {
    const page = (index: number): FakeInvestigation[] =>
      Array.from({ length: 100 }, (_, offset) => ({
        id: `inv-${index}-${offset}`,
        alertIds: [`ep-${index}-${offset}`],
      }));
    const { reader, list } = createLister(
      Array.from({ length: 11 }, (_, index) => page(index)),
      1_500
    );

    const sets = await listInvestigationStateSets({
      agenticInvestigations: reader,
      request,
      logger,
    });

    expect(list).toHaveBeenCalledTimes(10);
    expect(sets).not.toBe('unavailable');
    if (sets !== 'unavailable') {
      expect(sets.completed).toHaveLength(1_000);
      expect(sets.truncated).toBe(true);
    }
  });

  it('is unavailable when the whole listing outlasts its deadline, not only one page', async () => {
    const { reader, list } = createLister(
      [
        Array.from({ length: 100 }, (_, offset) => ({
          id: `a-${offset}`,
          alertIds: [`ep-a-${offset}`],
        })),
        [{ id: 'b', alertIds: ['ep-b'] }],
      ],
      101
    );
    const now = jest.spyOn(Date, 'now');
    // The deadline is set and checked for page 1 at t=0, then page 2 starts after it has passed.
    now.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(60_000);

    try {
      expect(
        await listInvestigationStateSets({ agenticInvestigations: reader, request, logger })
      ).toBe('unavailable');
      expect(list).toHaveBeenCalledTimes(1);
    } finally {
      now.mockRestore();
    }
  });

  it('is unavailable when the list call fails', async () => {
    const reader = {
      getInvestigationsClient: () => ({
        list: async () => {
          throw new Error('missing read_investigations');
        },
      }),
    } as never;

    expect(
      await listInvestigationStateSets({ agenticInvestigations: reader, request, logger })
    ).toBe('unavailable');
  });
});

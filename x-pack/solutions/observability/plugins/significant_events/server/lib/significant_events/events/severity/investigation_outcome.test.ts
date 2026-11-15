/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type {
  InvestigationSubjectResponse,
  InvestigationSummary,
} from '@kbn/agentic-investigations-plugin/common';
import { loadInvestigationOutcomes, resolveInvestigationOutcomes } from './investigation_outcome';

const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as Logger;
const request = {} as KibanaRequest;

type SubjectRef = Pick<InvestigationSubjectResponse, 'type' | 'id'> & { source?: string };
type InvestigationOverrides = Omit<Partial<InvestigationSummary>, 'subjects'> & {
  subjects?: SubjectRef[];
};

const investigation = ({
  subjects = [{ type: 'alert', id: 'episode-1' }],
  ...overrides
}: InvestigationOverrides = {}): InvestigationSummary =>
  ({
    id: 'inv-1',
    created_at: '2026-11-09T10:00:00.000Z',
    in_progress: false,
    metadata: { status: 'open', severity: 'high', verdict: 'the cause' },
    impact: { summary: 'the impact' },
    subjects: subjects.map(({ type, id, source = SIGNIFICANT_EVENTS_ALERT_SOURCE }) => ({
      type,
      id,
      snapshot: { source },
      created_at: '2026-11-09T10:00:00.000Z',
    })),
    ...overrides,
  } as InvestigationSummary);

const withSeverity = (severity: string) =>
  investigation({ metadata: { status: 'open', severity, verdict: 'v' } as never });

describe('resolveInvestigationOutcomes', () => {
  const resolve = (
    investigations: InvestigationSummary[],
    eventIdsByEpisode: Record<string, string[]> = { 'episode-1': ['event-1'] }
  ) =>
    resolveInvestigationOutcomes({
      investigations,
      eventIdsByEpisode: new Map(Object.entries(eventIdsByEpisode)),
    });

  it('a recorded investigation gives its event its severity, even the placeholder value medium', () => {
    expect(resolve([withSeverity('medium')]).outcomes.get('event-1')?.severity).toBe('medium');
  });

  it.each<[string, Partial<InvestigationSummary>]>([
    ['in progress', { in_progress: true }],
    [
      'without a severity',
      { metadata: { status: 'open', verdict: 'the cause' } } as Partial<InvestigationSummary>,
    ],
    [
      'with an invalid severity',
      { metadata: { status: 'open', severity: 'urgent', verdict: 'v' } } as never,
    ],
    [
      'without a verdict',
      { metadata: { status: 'open', severity: 'high' } } as Partial<InvestigationSummary>,
    ],
    ['without an impact summary', { impact: undefined }],
  ])('ignores an investigation %s (it is not recorded)', (_name, overrides) => {
    expect(resolve([investigation(overrides)]).outcomes.size).toBe(0);
  });

  it.each([
    ['listed oldest first', false],
    ['listed newest first', true],
  ])('the newest investigation by created_at wins (%s)', (_name, newestFirst) => {
    const old = { ...withSeverity('low'), id: 'old', created_at: '2026-11-09T10:00:00.000Z' };
    const current = { ...withSeverity('high'), id: 'new', created_at: '2026-11-10T10:00:00.000Z' };

    expect(
      resolve(newestFirst ? [current, old] : [old, current]).outcomes.get('event-1')?.severity
    ).toBe('high');
  });

  it('falls back to an older recorded investigation when the newer one is not recorded', () => {
    const old = { ...withSeverity('low'), id: 'old', created_at: '2026-11-09T10:00:00.000Z' };
    const running = investigation({
      id: 'new',
      created_at: '2026-11-10T10:00:00.000Z',
      in_progress: true,
    });

    expect(resolve([old, running]).outcomes.get('event-1')?.severity).toBe('low');
  });

  it('one investigation governs every event of its episodes', () => {
    const { outcomes } = resolve(
      [
        investigation({
          subjects: [
            { type: 'alert', id: 'episode-1' },
            { type: 'alert', id: 'episode-2' },
          ],
        }),
      ],
      { 'episode-1': ['event-1'], 'episode-2': ['event-2'] }
    );

    expect([...outcomes]).toEqual([
      ['event-1', { severity: 'high' }],
      ['event-2', { severity: 'high' }],
    ]);
  });

  it('a re-opened event follows the newest investigation across its episodes', () => {
    const first = {
      ...withSeverity('low'),
      id: 'first',
      created_at: '2026-11-01T10:00:00.000Z',
    };
    const second = {
      ...investigation({ subjects: [{ type: 'alert', id: 'episode-2' }] }),
      id: 'second',
      created_at: '2026-11-08T10:00:00.000Z',
      metadata: { status: 'open', severity: 'critical', verdict: 'v' },
    } as InvestigationSummary;

    const { outcomes } = resolve([first, second], {
      'episode-1': ['event-1'],
      'episode-2': ['event-1'],
    });

    expect(outcomes.get('event-1')?.severity).toBe('critical');
  });

  it('ignores an episode that maps to no event, and skips one that maps to several', () => {
    const { outcomes, ambiguousEpisodeIds } = resolve(
      [
        investigation({
          subjects: [
            { type: 'alert', id: 'unknown' },
            { type: 'alert', id: 'shared' },
          ],
        }),
      ],
      { shared: ['event-1', 'event-2'] }
    );

    expect(outcomes.size).toBe(0);
    expect(ambiguousEpisodeIds).toEqual(['shared']);
  });

  it('ignores alert subjects that are not significant events alerts', () => {
    const { outcomes } = resolve([
      investigation({ subjects: [{ type: 'alert', id: 'episode-1', source: 'universal' }] }),
    ]);

    expect(outcomes.size).toBe(0);
  });
});

describe('loadInvestigationOutcomes', () => {
  const setup = ({
    episodeIdsByEvent = new Map([['event-1', ['episode-1']]]),
    conversationIds = ['inv-1'],
    results = [investigation()],
    list,
  }: {
    episodeIdsByEvent?: Map<string, string[]>;
    conversationIds?: string[];
    results?: InvestigationSummary[];
    list?: jest.Mock;
  } = {}) => {
    const findEpisodeIdsByEventIds = jest.fn(async () => episodeIdsByEvent);
    const findConversationIdsBySubjects = jest.fn(async () => conversationIds);
    const listInvestigations =
      list ?? jest.fn(async () => ({ results, pagination: { total: results.length } }));
    return {
      findEpisodeIdsByEventIds,
      findConversationIdsBySubjects,
      listInvestigations,
      load: (eventIds: string[] = ['event-1']) =>
        loadInvestigationOutcomes({
          request,
          logger,
          eventIds,
          agenticInvestigations: {
            getSubjectsClient: () => ({ findConversationIdsBySubjects } as never),
            getInvestigationsClient: () => ({ list: listInvestigations } as never),
          },
          eventClient: { findEpisodeIdsByEventIds },
        }),
    };
  };

  beforeEach(() => jest.clearAllMocks());

  it('finds the investigations of the events episodes by key and reads them by id', async () => {
    const { load, findConversationIdsBySubjects, listInvestigations } = setup();

    const outcome = await load();

    expect(outcome.status === 'available' && Object.fromEntries(outcome.outcomes)).toEqual({
      'event-1': { severity: 'high' },
    });
    expect(findConversationIdsBySubjects).toHaveBeenCalledWith([
      { type: 'alert', id: 'episode-1' },
    ]);
    expect(listInvestigations).toHaveBeenCalledWith({ id: ['inv-1'], per_page: 1 });
  });

  it('returns only the requested events, though an investigation can govern others', async () => {
    const { load } = setup({
      results: [
        investigation({
          subjects: [
            { type: 'alert', id: 'episode-1' },
            { type: 'alert', id: 'episode-elsewhere' },
          ],
        }),
      ],
    });

    const outcome = await load();

    expect(outcome.status === 'available' && [...outcome.outcomes.keys()]).toEqual(['event-1']);
  });

  it('reads nothing for no events, or for events with no episode', async () => {
    const none = setup();
    expect(await none.load([])).toEqual({ status: 'available', outcomes: new Map() });
    expect(none.findEpisodeIdsByEventIds).not.toHaveBeenCalled();

    const noEpisodes = setup({ episodeIdsByEvent: new Map() });
    expect(await noEpisodes.load()).toEqual({ status: 'available', outcomes: new Map() });
    expect(noEpisodes.listInvestigations).not.toHaveBeenCalled();
  });

  it('batches the key lookups by 50 episodes and the reads by 100 ids', async () => {
    const eventIds = Array.from({ length: 60 }, (_, index) => `event-${index}`);
    const { load, findConversationIdsBySubjects, listInvestigations } = setup({
      episodeIdsByEvent: new Map(eventIds.map((id) => [id, [`episode-of-${id}`]])),
      conversationIds: Array.from({ length: 150 }, (_, index) => `inv-${index}`),
      results: [],
    });

    await load(eventIds);

    expect(findConversationIdsBySubjects).toHaveBeenCalledTimes(2);
    expect(listInvestigations).toHaveBeenCalledTimes(2);
    listInvestigations.mock.calls.forEach(([query]) =>
      expect(query.id.length).toBeLessThanOrEqual(100)
    );
  });

  it('is unavailable when the investigations plugin is not installed', async () => {
    const outcome = await loadInvestigationOutcomes({
      request,
      logger,
      eventIds: ['event-1'],
      agenticInvestigations: undefined,
      eventClient: { findEpisodeIdsByEventIds: jest.fn() },
    });

    expect(outcome).toEqual({ status: 'unavailable', reason: 'not_installed' });
  });

  it.each([
    ['a caller that cannot read investigations', 'InvestigationsForbiddenError', 'forbidden'],
    ['any other failure', 'Error', 'error'],
  ])('is unavailable for %s', async (_name, errorName, reason) => {
    const { load } = setup({
      list: jest.fn(async () => {
        throw Object.assign(new Error('no'), { name: errorName });
      }),
    });

    expect(await load()).toEqual({ status: 'unavailable', reason });
  });

  it('is unavailable when reading the investigations times out', async () => {
    jest.useFakeTimers();
    try {
      const { load } = setup({ list: jest.fn(() => new Promise(() => undefined)) });

      const pending = load();
      await jest.advanceTimersByTimeAsync(10_000);

      expect(await pending).toEqual({ status: 'unavailable', reason: 'timeout' });
    } finally {
      jest.useRealTimers();
    }
  });
});

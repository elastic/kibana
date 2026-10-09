/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CountTimeframeStrategy } from '@kbn/alerting-v2-plugin/server/lib/director/strategies/count_timeframe_strategy';
import { decideLifecycle } from './lifecycle_state_machine';
import { RECOVERING_COUNT, type StatusOutcome } from './status_transition';

/**
 * Conformance with the Alerting v2 director (target architecture §4, "Why we re-implement the
 * director"). Our evaluation path is a copy of the director's `BasicTransitionStrategy` plus
 * `CountTimeframeStrategy` for the series we own, so the same evaluations are fed to both and any
 * difference fails here. Deliberate deviations are asserted at the bottom.
 */

type DirectorStatus = 'pending' | 'active' | 'recovering' | 'inactive';
type DirectorEvent = 'breached' | 'recovered' | 'no_data';

const OUTCOME_TO_EVENT: Record<StatusOutcome, DirectorEvent> = {
  breaching: 'breached',
  clean: 'recovered',
  no_data: 'no_data',
};

const loggerService = {
  forSubsystem: () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }),
};

const director = new CountTimeframeStrategy(loggerService as never);

const directorNext = ({
  status,
  statusCount,
  event,
}: {
  status: DirectorStatus;
  statusCount: number | null;
  event: DirectorEvent;
}): { status: DirectorStatus; statusCount?: number } =>
  director.getNextState({
    rule: {
      id: 'rule-1',
      // The count a rule configures for its recovering phase; ours is RECOVERING_COUNT.
      state_transition: { recovering: { count: RECOVERING_COUNT } },
      no_data: { strategy: 'keep_last' },
    } as never,
    alertEvent: { status: event } as never,
    evaluatedAt: '2026-01-01T00:00:00.000Z',
    previousEpisode: {
      last_status: event,
      last_episode_id: 'episode-1',
      last_episode_status: status,
      last_episode_status_count: statusCount,
      last_episode_timestamp: '2026-01-01T00:00:00.000Z',
      last_lifecycle_action_type: null,
      group_hash: 'hash-1',
    } as never,
  }) as { status: DirectorStatus; statusCount?: number };

interface Series {
  status: 'active' | 'recovering';
  /** Evaluations spent in `recovering`; the director's `status_count` there. */
  count: number;
}

interface Next {
  status: 'active' | 'recovering' | 'inactive';
  count: number;
}

const oursNext = (series: Series, outcome: StatusOutcome): Next => {
  const decision = decideLifecycle({
    state: {
      status: series.status,
      evaluations: series.status === 'recovering' ? series.count : 0,
    },
    input: { kind: 'evaluation', outcome },
  });
  if (!decision.write) {
    return { status: series.status, count: series.count };
  }
  return {
    status: decision.status as Next['status'],
    count: decision.status === 'recovering' ? decision.evaluations ?? 0 : 0,
  };
};

const directorSeriesNext = (series: Series, outcome: StatusOutcome): Next => {
  const result = directorNext({
    status: series.status,
    statusCount: series.status === 'recovering' ? series.count : null,
    event: OUTCOME_TO_EVENT[outcome],
  });
  const status = result.status as Next['status'];
  if (status === 'recovering') {
    // Entering recovering, the director sets the count to one; staying, it returns count + 1;
    // holding (no_data), it returns no count and the stored one stands.
    return {
      status,
      count: result.statusCount ?? (series.status === 'recovering' ? series.count : 1),
    };
  }
  return { status, count: 0 };
};

describe('lifecycle state machine conforms to the Alerting v2 director', () => {
  const outcomes: StatusOutcome[] = ['breaching', 'clean', 'no_data'];

  describe('every single evaluation', () => {
    const series: Series[] = [
      { status: 'active', count: 0 },
      ...Array.from({ length: RECOVERING_COUNT + 2 }, (_, index) => ({
        status: 'recovering' as const,
        count: index + 1,
      })),
    ];

    it.each(series.flatMap((current) => outcomes.map((outcome) => [current, outcome] as const)))(
      '%j, %s',
      (current, outcome) => {
        expect(oursNext(current, outcome)).toEqual(directorSeriesNext(current, outcome));
      }
    );
  });

  describe('whole trajectories', () => {
    /** Small deterministic generator, so a failing seed reproduces. */
    const seededRandom = (seed: number) => {
      let state = seed;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    };

    it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
      'seed %i: same status and count after every step',
      (seed) => {
        const random = seededRandom(seed);
        let ours: Series = { status: 'active', count: 0 };
        let theirs: Series = { status: 'active', count: 0 };

        for (let step = 0; step < 300; step++) {
          const draw = random();
          // Weighted towards clean so the series spends time deep in recovering.
          const outcome: StatusOutcome =
            draw < 0.2 ? 'breaching' : draw < 0.9 ? 'clean' : 'no_data';

          const nextOurs = oursNext(ours, outcome);
          const nextTheirs = directorSeriesNext(theirs, outcome);
          expect(nextOurs).toEqual(nextTheirs);

          // A closed series is out of this machine's scope; both start a new episode as active.
          ours =
            nextOurs.status === 'inactive' ? { status: 'active', count: 0 } : (nextOurs as Series);
          theirs =
            nextTheirs.status === 'inactive'
              ? { status: 'active', count: 0 }
              : (nextTheirs as Series);
        }
      }
    );
  });

  it('closes after exactly N+1 consecutive clean evaluations, in both', () => {
    let ours: Series = { status: 'active', count: 0 };
    let theirs: Series = { status: 'active', count: 0 };
    const statuses: string[] = [];

    for (let step = 0; step < RECOVERING_COUNT + 1; step++) {
      const nextOurs = oursNext(ours, 'clean');
      const nextTheirs = directorSeriesNext(theirs, 'clean');
      expect(nextOurs).toEqual(nextTheirs);
      statuses.push(nextOurs.status);
      ours = nextOurs as Series;
      theirs = nextTheirs as Series;
    }

    expect(statuses).toEqual(['recovering', 'recovering', 'recovering', 'inactive']);
  });

  describe('deliberate deviations', () => {
    it('has no pending phase: the director opens a series as pending, ours opens it active', () => {
      expect(directorNext({ status: 'pending', statusCount: null, event: 'breached' }).status).toBe(
        'active'
      );
      expect(
        directorNext({ status: 'inactive', statusCount: null, event: 'breached' }).status
      ).toBe('pending');
      expect(
        decideLifecycle({
          state: { status: undefined, evaluations: 0 },
          input: { kind: 'assessment', outcome: 'breaching' },
        })
      ).toEqual({ write: true, status: 'active' });
    });

    it('does not evaluate a series that is not live, where the director would start pending', () => {
      expect(
        decideLifecycle({
          state: { status: 'inactive', evaluations: 0 },
          input: { kind: 'evaluation', outcome: 'breaching' },
        })
      ).toEqual({ write: false, reason: 'not_live' });
    });
  });
});

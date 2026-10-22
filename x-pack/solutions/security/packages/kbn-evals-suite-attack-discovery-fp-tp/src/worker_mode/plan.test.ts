/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_TP_EXAMPLES } from '../scenarios';
import { FP_TP_RAW_EVENT_WINDOW_MS, FP_TP_TWIN_SEED_LABEL } from '../world';
import {
  WORKER_MODE_DEFAULT_EXAMPLES,
  WORKER_MODE_LAST_ALERT_OFFSET_MS,
  WORKER_MODE_OUTCOMES,
  WORKER_MODE_OUTCOME_VERDICTS,
} from './constants';
import {
  assertWorkerModeSpace,
  buildWorkerModePlan,
  createWorkerModeSuffix,
  resolveWorkerModeExample,
  WORKER_MODE_EXAMPLES,
  workerModeCleanupTargets,
} from './plan';

const NOW = new Date('2026-10-14T12:00:00.000Z');

const timestamps = (documents: ReadonlyArray<{ source: Record<string, unknown> }>): number[] =>
  documents.map(({ source }) => Date.parse(String(source['@timestamp'])));

const operationTargets = (operations: unknown[]): Array<{ _index: string; _id: string }> =>
  operations
    .filter((operation): operation is { create: { _index: string; _id: string } } =>
      Boolean((operation as { create?: unknown }).create)
    )
    .map(({ create }) => create);

describe('assertWorkerModeSpace', () => {
  it('returns a dedicated space', () => {
    expect(assertWorkerModeSpace('qa-fp-tp')).toBe('qa-fp-tp');
  });

  it.each([undefined, '', 'default', 'Has Spaces'])('throws for %p', (space) => {
    expect(() => assertWorkerModeSpace(space)).toThrow();
  });
});

describe('resolveWorkerModeExample', () => {
  it.each(WORKER_MODE_OUTCOMES.map((outcome) => [outcome]))(
    'returns a %s default example whose gold is that outcome',
    (outcome) => {
      expect(resolveWorkerModeExample({ outcome }).expectedOutcome).toBe(
        WORKER_MODE_OUTCOME_VERDICTS[outcome]
      );
    }
  );

  it('returns the truncated-events example for inconclusive', () => {
    expect(resolveWorkerModeExample({ outcome: 'inconclusive' }).id).toBe(
      WORKER_MODE_DEFAULT_EXAMPLES.inconclusive
    );
  });

  it('returns any example with a non-failed gold by id', () => {
    expect(resolveWorkerModeExample({ exampleId: 'encoded-powershell.mixed-world' }).id).toBe(
      'encoded-powershell.mixed-world'
    );
  });

  it('throws for an example whose gold is failed', () => {
    expect(() =>
      resolveWorkerModeExample({ exampleId: 'encoded-powershell.failed-missing-ad' })
    ).toThrow('is not an example worker mode can seed');
  });

  it('throws when neither or both selectors are passed', () => {
    expect(() => resolveWorkerModeExample({})).toThrow('exactly one');
    expect(() =>
      resolveWorkerModeExample({ outcome: 'fp', exampleId: 'encoded-powershell.fp' })
    ).toThrow('exactly one');
  });

  it('returns every registered example except the failed ones', () => {
    expect(WORKER_MODE_EXAMPLES.map(({ id }) => id)).toEqual(
      FP_TP_EXAMPLES.filter(({ expectedOutcome }) => expectedOutcome !== 'failed').map(
        ({ id }) => id
      )
    );
  });
});

describe('createWorkerModeSuffix', () => {
  it('returns a different suffix on every call', () => {
    expect(createWorkerModeSuffix(NOW)).not.toBe(createWorkerModeSuffix(NOW));
  });
});

describe('buildWorkerModePlan', () => {
  const plan = buildWorkerModePlan({
    space: 'qa-fp',
    exampleId: 'encoded-powershell.fp',
    now: NOW,
    suffix: 'run1',
  });

  it('returns a world without an attack', () => {
    expect(plan.world.attack).toBeUndefined();
  });

  it('returns no attack document among the operations', () => {
    const indices = [
      ...operationTargets(plan.alertOperations),
      ...operationTargets(plan.eventOperations),
    ].map(({ _index: index }) => index);
    expect(indices.filter((index) => index.includes('attack.discovery'))).toEqual([]);
  });

  it('returns the example gold as the expected outcome', () => {
    expect(plan.expectedOutcome).toBe('false_positive');
  });

  it('returns a run marker built from the seed label', () => {
    expect(plan.runMarker).toBe(`${FP_TP_TWIN_SEED_LABEL}-run1`);
  });

  it('returns the last alert five minutes before now', () => {
    expect(Math.max(...timestamps(plan.world.alerts))).toBe(
      NOW.getTime() - WORKER_MODE_LAST_ALERT_OFFSET_MS
    );
    expect(plan.lastAlertAt).toBe('2026-10-14T11:55:00.000Z');
  });

  it('returns no document in the future', () => {
    const all = [...plan.world.alerts, ...plan.world.events, ...plan.world.entities];
    expect(timestamps(all).filter((time) => time > NOW.getTime())).toEqual([]);
  });

  it('returns a window deadline two hours after the first event', () => {
    expect(Date.parse(plan.windowDeadline)).toBe(
      Math.min(...timestamps(plan.world.events)) + FP_TP_RAW_EVENT_WINDOW_MS
    );
  });

  it('returns every raw event inside the window of a run at the deadline', () => {
    const deadline = Date.parse(plan.windowDeadline);
    expect(
      timestamps(plan.world.events).filter(
        (time) => Math.abs(deadline - time) > FP_TP_RAW_EVENT_WINDOW_MS
      )
    ).toEqual([]);
  });

  it('returns alerts written to the space alerts index and tagged to the space', () => {
    expect(
      new Set(operationTargets(plan.alertOperations).map(({ _index: index }) => index))
    ).toEqual(new Set(['.alerts-security.alerts-qa-fp']));
    expect(
      new Set(plan.world.alerts.map(({ source }) => JSON.stringify(source['kibana.space_ids'])))
    ).toEqual(new Set(['["qa-fp"]']));
  });

  it('returns alerts tagged with the run marker, which the cleanup finds them by', () => {
    expect(
      plan.world.alerts.filter(({ source }) => !(source.tags as string[]).includes(plan.runMarker))
    ).toEqual([]);
  });

  it('returns create operations for every alert and event', () => {
    expect(operationTargets(plan.alertOperations).map(({ _id: id }) => id)).toEqual(plan.alertIds);
    expect(operationTargets(plan.eventOperations)).toEqual(
      plan.events.map(({ index, id }) => ({ _index: index, _id: id }))
    );
  });

  it('returns the space entity alias', () => {
    expect(plan.entityReadAlias).toBe('entities-latest-qa-fp');
  });

  it('returns the host of every alert and event', () => {
    const hostIds = [...plan.world.alerts, ...plan.world.events].map(
      ({ source }) => (source.host as { id: string }).id
    );
    expect(new Set(plan.hostIds)).toEqual(new Set(hostIds));
  });

  describe('for two runs of the same example', () => {
    const fp = buildWorkerModePlan({
      space: 'qa-fp',
      exampleId: 'encoded-powershell.fp',
      now: NOW,
    });
    const again = buildWorkerModePlan({
      space: 'qa-fp',
      exampleId: 'encoded-powershell.fp',
      now: NOW,
    });

    it('returns different run markers', () => {
      expect(fp.runMarker).not.toBe(again.runMarker);
    });

    it('returns disjoint alert ids', () => {
      expect(again.alertIds.filter((id) => fp.alertIds.includes(id))).toEqual([]);
    });

    it('returns disjoint host ids', () => {
      expect(again.hostIds.filter((id) => fp.hostIds.includes(id))).toEqual([]);
    });
  });

  it('returns disjoint alert and host ids for the fp and tp twins', () => {
    const fp = buildWorkerModePlan({
      space: 'qa-fp',
      exampleId: 'encoded-powershell.fp',
      now: NOW,
    });
    const tp = buildWorkerModePlan({
      space: 'qa-tp',
      exampleId: 'encoded-powershell.tp',
      now: NOW,
    });
    expect(tp.alertIds.filter((id) => fp.alertIds.includes(id))).toEqual([]);
    expect(tp.hostIds.filter((id) => fp.hostIds.includes(id))).toEqual([]);
  });

  it('returns a window deadline from the first alert when the world has no events', () => {
    const eventless = buildWorkerModePlan({
      space: 'qa-x',
      exampleId: 'encoded-powershell.tp-events-missing',
      now: NOW,
    });
    expect(eventless.firstEventAt).toBeUndefined();
    expect(Date.parse(eventless.windowDeadline)).toBe(
      Math.min(...timestamps(eventless.world.alerts)) + FP_TP_RAW_EVENT_WINDOW_MS
    );
  });

  it('throws for the default space', () => {
    expect(() =>
      buildWorkerModePlan({ space: 'default', exampleId: 'encoded-powershell.fp', now: NOW })
    ).toThrow('refuses the default space');
  });

  it('throws for an example whose gold is failed', () => {
    expect(() =>
      buildWorkerModePlan({
        space: 'qa-fp',
        exampleId: 'encoded-powershell.failed-missing-cited-alert',
        now: NOW,
      })
    ).toThrow('is not an example worker mode can seed');
  });
});

describe.each(WORKER_MODE_EXAMPLES.map(({ id }) => [id]))('buildWorkerModePlan for %s', (id) => {
  const plan = buildWorkerModePlan({ space: 'qa-all', exampleId: id, now: NOW, suffix: 'run1' });

  it('returns at least one alert and no attack', () => {
    expect(plan.alertIds.length).toBeGreaterThan(0);
    expect(plan.world.attack).toBeUndefined();
  });

  it('returns the last alert five minutes before now and nothing after now', () => {
    expect(Math.max(...timestamps(plan.world.alerts))).toBe(
      NOW.getTime() - WORKER_MODE_LAST_ALERT_OFFSET_MS
    );
    const all = [...plan.world.alerts, ...plan.world.events, ...plan.world.entities];
    expect(timestamps(all).filter((time) => time > NOW.getTime())).toEqual([]);
  });

  it('returns a window deadline at least an hour after the seed', () => {
    expect(Date.parse(plan.windowDeadline) - NOW.getTime()).toBeGreaterThanOrEqual(60 * 60 * 1000);
  });
});

describe('buildWorkerModePlan for the truncated-events example', () => {
  const plan = buildWorkerModePlan({
    space: 'qa-inc',
    exampleId: WORKER_MODE_DEFAULT_EXAMPLES.inconclusive,
    now: NOW,
    suffix: 'run1',
  });

  it('returns more raw events than the analysis page holds', () => {
    expect(plan.events.length).toBeGreaterThan(50);
  });

  it('returns every raw event before now', () => {
    expect(timestamps(plan.world.events).filter((time) => time > NOW.getTime())).toEqual([]);
  });
});

describe('workerModeCleanupTargets', () => {
  const targets = workerModeCleanupTargets('qa-fp');

  it('returns the space alerts index', () => {
    expect(targets.alertsIndex).toBe('.alerts-security.alerts-qa-fp');
  });

  it('returns a query that matches every run marker', () => {
    expect(targets.seededAlertsQuery).toEqual({ prefix: { tags: FP_TP_TWIN_SEED_LABEL } });
    const { runMarker } = buildWorkerModePlan({
      space: 'qa-fp',
      exampleId: 'encoded-powershell.tp',
      now: NOW,
    });
    expect(runMarker.startsWith(targets.seededAlertsQuery.prefix.tags)).toBe(true);
  });

  it('returns raw events in every namespace', () => {
    expect(targets.eventsIndexPattern).toBe('logs-endpoint.events.*');
  });

  it('returns the space entity alias', () => {
    expect(targets.entityReadAlias).toBe('entities-latest-qa-fp');
  });
});

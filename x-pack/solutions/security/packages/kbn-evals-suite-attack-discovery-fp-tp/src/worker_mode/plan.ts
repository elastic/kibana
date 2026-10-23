/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import type { FpTpOutcome } from '../constants';
import { buildFpTpExampleWorld, FP_TP_EXAMPLES, type FpTpRegisteredExample } from '../scenarios';
import {
  FP_TP_RAW_EVENT_WINDOW_MS,
  FP_TP_TWIN_SEED_LABEL,
  fpTpAlertsIndexForSpace,
  fpTpEntityReadAliasForSpace,
  shiftTimestamps,
  shiftTwinToNow,
  toEntityCrudRequest,
  toRunMarker,
  type FpTpEntityCrudRequest,
  type FpTpWorld,
} from '../world';
import {
  RAW_EVENTS_INDEX_PATTERN,
  WORKER_MODE_DEFAULT_EXAMPLES,
  WORKER_MODE_LAST_ALERT_OFFSET_MS,
  type WorkerModeOutcome,
} from './constants';

const SPACE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Worker mode seeds a dedicated space: its cleanup deletes every earlier seed's alerts
 * there, and it leaves Entity Store extraction stopped and the AD Worker enabled.
 */
export const assertWorkerModeSpace = (space: string | undefined): string => {
  if (space === undefined || space.length === 0) {
    throw new Error('--space is required: a dedicated space, not "default"');
  }
  if (space === 'default') {
    throw new Error(
      'Worker mode refuses the default space: it stops Entity Store extraction, enables the ' +
        'AD Worker, and treats every seeded alert in the space as its own. Use a dedicated space.'
    );
  }
  if (!SPACE_ID_PATTERN.test(space)) {
    throw new Error(
      `--space "${space}" is not a valid Kibana space id (expected [a-z0-9][a-z0-9_-]{0,63})`
    );
  }
  return space;
};

/**
 * Examples whose world the Worker can generate an attack from. A `failed` gold needs a
 * hand-made discovery (one that is missing or cites an unseeded alert), which only the
 * eval's authored attack can provide.
 */
export const WORKER_MODE_EXAMPLES: readonly FpTpRegisteredExample[] = FP_TP_EXAMPLES.filter(
  ({ expectedOutcome }) => expectedOutcome !== 'failed'
);

/** Resolves `--outcome` or `--example` to the example worker mode seeds. */
export const resolveWorkerModeExample = ({
  outcome,
  exampleId,
}: {
  outcome?: WorkerModeOutcome;
  exampleId?: string;
}): FpTpRegisteredExample => {
  if ((outcome === undefined) === (exampleId === undefined)) {
    throw new Error('Pass exactly one of --outcome or --example');
  }
  const id = exampleId ?? WORKER_MODE_DEFAULT_EXAMPLES[outcome as WorkerModeOutcome];
  const example = WORKER_MODE_EXAMPLES.find((candidate) => candidate.id === id);
  if (example === undefined) {
    throw new Error(
      `"${id}" is not an example worker mode can seed. Known: ${WORKER_MODE_EXAMPLES.map(
        (candidate) => candidate.id
      ).join(', ')}`
    );
  }
  return example;
};

/**
 * A fresh run suffix. Every seed needs its own marker: twins share alert ids under one
 * marker, and Attack Discovery persistence de-duplicates on a hash of the alert ids, so
 * re-seeding under an old marker generates no new attack and no review.
 */
export const createWorkerModeSuffix = (now: Date = new Date()): string =>
  `w${now.getTime().toString(36)}${randomBytes(2).toString('hex')}`;

export interface WorkerModeSeedPlan {
  readonly space: string;
  readonly exampleId: string;
  readonly scenarioKey: string;
  readonly expectedOutcome: FpTpOutcome;
  readonly runMarker: string;
  readonly alertsIndex: string;
  readonly entityReadAlias: string;
  readonly alertIds: readonly string[];
  readonly alertOperations: unknown[];
  readonly events: ReadonlyArray<{ index: string; id: string }>;
  readonly eventOperations: unknown[];
  readonly entities: readonly FpTpEntityCrudRequest[];
  /** `host.id` of every seeded alert and event. Unique per run: raw events are read by it across all namespaces. */
  readonly hostIds: readonly string[];
  readonly seededAt: string;
  readonly lastAlertAt: string;
  readonly firstEventAt?: string;
  /**
   * Latest generation time whose ±2h raw-event window still holds the first seeded
   * event. The analysis reads raw events around the discovery's `@timestamp`, which is
   * when the Worker generated it, so a later run misses events.
   */
  readonly windowDeadline: string;
  /** The world as indexed: shifted, scoped to the space, and without an attack. */
  readonly world: FpTpWorld;
}

const timestampOf = (source: Record<string, unknown>): number =>
  Date.parse(String(source['@timestamp']));

const hostIdOf = (source: Record<string, unknown>): string | undefined => {
  const { host } = source as { host?: { id?: unknown } };
  return typeof host?.id === 'string' ? host.id : undefined;
};

/**
 * Builds what one worker-mode seed writes: the example's alerts, raw events and
 * entities under a fresh run marker, without its authored attack, so the AD Worker
 * generates the attack itself. Timestamps move so the last alert is five minutes before
 * `now`, and alerts are tagged to `space`.
 */
export const buildWorkerModePlan = ({
  space,
  exampleId,
  now = new Date(),
  suffix = createWorkerModeSuffix(now),
}: {
  space: string;
  exampleId: string;
  now?: Date;
  suffix?: string;
}): WorkerModeSeedPlan => {
  assertWorkerModeSpace(space);
  const example = WORKER_MODE_EXAMPLES.find(({ id }) => id === exampleId);
  if (example === undefined) {
    throw new Error(`"${exampleId}" is not an example worker mode can seed`);
  }

  const authored = buildFpTpExampleWorld(exampleId, suffix);
  const lastAlertMs = Math.max(...authored.alerts.map(({ source }) => timestampOf(source)));
  const shifted = shiftTimestamps(
    { ...authored, attack: undefined },
    now.getTime() - WORKER_MODE_LAST_ALERT_OFFSET_MS - lastAlertMs
  );
  const world: FpTpWorld = {
    ...shifted,
    // Entities are authored as of the base time, the twin's "now", so they move to the
    // seed time rather than with the alerts, which would put them in the future.
    entities: shiftTwinToNow(authored.entities, now),
    alerts: shifted.alerts.map((alert) => ({
      ...alert,
      source: { ...alert.source, 'kibana.space_ids': [space] },
    })),
  };

  const alertsIndex = fpTpAlertsIndexForSpace(space);
  const eventTimes = world.events.map(({ source }) => timestampOf(source));
  const alertTimes = world.alerts.map(({ source }) => timestampOf(source));
  const firstEventMs = eventTimes.length > 0 ? Math.min(...eventTimes) : undefined;
  const hostIds = new Set(
    [...world.alerts, ...world.events]
      .map(({ source }) => hostIdOf(source))
      .filter((id): id is string => id !== undefined)
  );

  return {
    space,
    exampleId,
    scenarioKey: example.scenarioKey,
    expectedOutcome: example.expectedOutcome,
    runMarker: toRunMarker(suffix),
    alertsIndex,
    entityReadAlias: fpTpEntityReadAliasForSpace(space),
    alertIds: world.alerts.map(({ id }) => id),
    // Bulk `create`, never `index`: a leftover id fails loudly instead of being overwritten.
    alertOperations: world.alerts.flatMap((alert) => [
      { create: { _index: alertsIndex, _id: alert.id } },
      alert.source,
    ]),
    events: world.events.map(({ index, id }) => ({ index, id })),
    eventOperations: world.events.flatMap((event) => [
      { create: { _index: event.index, _id: event.id } },
      event.source,
    ]),
    entities: world.entities.map(toEntityCrudRequest),
    hostIds: [...hostIds],
    seededAt: now.toISOString(),
    lastAlertAt: new Date(Math.max(...alertTimes)).toISOString(),
    firstEventAt: firstEventMs === undefined ? undefined : new Date(firstEventMs).toISOString(),
    // Kept on the manifest. The search no longer uses it: the analysis window follows
    // the cited alerts' `kibana.alert.original_time`, not the discovery timestamp.
    windowDeadline: new Date(
      (firstEventMs ?? Math.min(...alertTimes)) + FP_TP_RAW_EVENT_WINDOW_MS
    ).toISOString(),
    world,
  };
};

export interface WorkerModeCleanupTargets {
  readonly alertsIndex: string;
  /** Every seed's alerts carry their run marker in `tags`, and every marker starts with the seed label. */
  readonly seededAlertsQuery: { readonly prefix: { readonly tags: string } };
  /** Raw events are found by the `host.id` of the seeded alerts, in every namespace. */
  readonly eventsIndexPattern: string;
  readonly entityReadAlias: string;
}

/** Where an earlier worker-mode seed in `space` left documents. */
export const workerModeCleanupTargets = (space: string): WorkerModeCleanupTargets => ({
  alertsIndex: fpTpAlertsIndexForSpace(space),
  seededAlertsQuery: { prefix: { tags: FP_TP_TWIN_SEED_LABEL } },
  eventsIndexPattern: RAW_EVENTS_INDEX_PATTERN,
  entityReadAlias: fpTpEntityReadAliasForSpace(space),
});

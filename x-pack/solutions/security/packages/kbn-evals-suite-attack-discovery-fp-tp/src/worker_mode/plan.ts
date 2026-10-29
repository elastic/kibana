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

/** Host and user shared by every set of one attack. Alert and event ids stay per set. */
export interface WorkerModeHostUser {
  readonly hostId: string;
  readonly hostName: string;
  readonly userName: string;
}

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
  /**
   * `host.id` of every seeded alert and event. A set that reuses another set's host
   * keeps that id; raw events are read by it across all namespaces.
   */
  readonly hostIds: readonly string[];
  /**
   * True when this set reuses a host and user that another set already stored.
   * Failure cleanup then removes only this set's alerts and events.
   */
  readonly sharesHostUser: boolean;
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

const hostUserOf = (source: Record<string, unknown>): WorkerModeHostUser | undefined => {
  const host = source.host as { id?: unknown; name?: unknown } | undefined;
  const user = source.user as { name?: unknown } | undefined;
  if (
    typeof host?.id !== 'string' ||
    host.id.length === 0 ||
    typeof host.name !== 'string' ||
    host.name.length === 0 ||
    typeof user?.name !== 'string' ||
    user.name.length === 0
  ) {
    return undefined;
  }
  return { hostId: host.id, hostName: host.name, userName: user.name };
};

/** The one host and user these alerts share. Throws when they name more than one. */
export const hostUserFromAlerts = (
  alerts: ReadonlyArray<{ source: Record<string, unknown> }>
): WorkerModeHostUser => {
  const found = new Map<string, WorkerModeHostUser>();
  for (const { source } of alerts) {
    const hostUser = hostUserOf(source);
    if (hostUser === undefined) {
      throw new Error('Every seeded alert needs a host.id, host.name, and user.name');
    }
    found.set(`${hostUser.hostId}\0${hostUser.hostName}\0${hostUser.userName}`, hostUser);
  }
  if (found.size !== 1) {
    throw new Error(
      `A shared host and user seed needs exactly one host and one user, found ${found.size}`
    );
  }
  const [hostUser] = found.values();
  return hostUser;
};

const replaceStrings = <T>(value: T, pairs: ReadonlyArray<readonly [string, string]>): T => {
  const ordered = pairs
    .filter(([from, to]) => from !== to && from.length > 0)
    .sort(([left], [right]) => right.length - left.length);
  const walk = (current: unknown): unknown => {
    if (typeof current === 'string') {
      return ordered.reduce((text, [from, to]) => text.split(from).join(to), current);
    }
    if (Array.isArray(current)) {
      return current.map((item) => walk(item));
    }
    if (typeof current === 'object' && current !== null) {
      return Object.fromEntries(Object.entries(current).map(([key, item]) => [key, walk(item)]));
    }
    return current;
  };
  return walk(value) as T;
};

/**
 * Rewrites a freshly built set onto an existing host and user. Alert and event ids,
 * which are digests of this set's own run marker, stay. Entities are dropped: the
 * first set already stored them for this host.
 */
const withSharedHostUser = (world: FpTpWorld, hostUser: WorkerModeHostUser): FpTpWorld => {
  const own = hostUserFromAlerts(world.alerts);
  return {
    ...replaceStrings(world, [
      [own.hostId, hostUser.hostId],
      [own.hostName, hostUser.hostName],
      [own.userName, hostUser.userName],
    ]),
    entities: [],
  };
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
  hostUser,
}: {
  space: string;
  exampleId: string;
  now?: Date;
  suffix?: string;
  /** Reuse this host and user instead of the ones this set's run marker would create. */
  hostUser?: WorkerModeHostUser;
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
  const indexed = hostUser === undefined ? world : withSharedHostUser(world, hostUser);

  const alertsIndex = fpTpAlertsIndexForSpace(space);
  const eventTimes = indexed.events.map(({ source }) => timestampOf(source));
  const alertTimes = indexed.alerts.map(({ source }) => timestampOf(source));
  const firstEventMs = eventTimes.length > 0 ? Math.min(...eventTimes) : undefined;
  const hostIds = new Set(
    [...indexed.alerts, ...indexed.events]
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
    alertIds: indexed.alerts.map(({ id }) => id),
    // Bulk `create`, never `index`: a leftover id fails loudly instead of being overwritten.
    alertOperations: indexed.alerts.flatMap((alert) => [
      { create: { _index: alertsIndex, _id: alert.id } },
      alert.source,
    ]),
    events: indexed.events.map(({ index, id }) => ({ index, id })),
    eventOperations: indexed.events.flatMap((event) => [
      { create: { _index: event.index, _id: event.id } },
      event.source,
    ]),
    entities: indexed.entities.map(toEntityCrudRequest),
    hostIds: [...hostIds],
    sharesHostUser: hostUser !== undefined,
    seededAt: now.toISOString(),
    lastAlertAt: new Date(Math.max(...alertTimes)).toISOString(),
    firstEventAt: firstEventMs === undefined ? undefined : new Date(firstEventMs).toISOString(),
    // Kept on the manifest. The search no longer uses it: the analysis window follows
    // the cited alerts' `kibana.alert.original_time`, not the discovery timestamp.
    windowDeadline: new Date(
      (firstEventMs ?? Math.min(...alertTimes)) + FP_TP_RAW_EVENT_WINDOW_MS
    ).toISOString(),
    world: indexed,
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

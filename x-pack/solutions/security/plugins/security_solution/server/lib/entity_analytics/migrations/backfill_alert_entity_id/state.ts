/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 */

const spaceProgressSchema = schema.object({
  // The space's scoring window resolved to absolute timestamps when its pass started.
  window: schema.maybe(schema.object({ start: schema.string(), end: schema.string() })),
  // The Elasticsearch task running this space's update-by-query, while one is in flight. Progress
  // lives in Elasticsearch rather than here: the request keeps running across Kibana restarts, and
  // a later run reattaches by polling this id.
  esTaskId: schema.maybe(schema.string()),
  // True once this space needs no further work — either its pass completed, or it failed enough consecutive times that we gave up on it.
  done: schema.boolean(),
  // Consecutive failures. Reset on any success. Once it reaches the retry limit the space is marked done
  failures: schema.number(),
  // Times this space's update-by-query was reissued because the previous one stepped over alerts
  // another writer held. Bounded, so an alert being written continuously cannot keep it going.
  conflictReissues: schema.number(),
  // Alerts stamped by requests that have finished. A request still in flight is not counted until
  // it completes, so this never goes backwards.
  stamped: schema.number(),
  // Alerts waiting to be stamped when this space's first request was issued.
  unstampedAtStart: schema.maybe(schema.number()),
});

export type SpaceProgress = TypeOf<typeof spaceProgressSchema>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toCount = (value: unknown): number => (typeof value === 'number' ? value : 0);

const toWindow = (value: unknown): SpaceProgress['window'] => {
  if (!isRecord(value) || typeof value.start !== 'string' || typeof value.end !== 'string') {
    return undefined;
  }
  return { start: value.start, end: value.end };
};

/**
 * Rebuilt field by field rather than passed through: Task Manager throws if an `up` migration
 * returns anything the schema rejects, and a throwing migration fails the task permanently,
 * because the state it chokes on is never replaced.
 */
const toSpaceProgress = (value: unknown): SpaceProgress => {
  const progress = isRecord(value) ? value : {};

  return {
    window: toWindow(progress.window),
    esTaskId: typeof progress.esTaskId === 'string' ? progress.esTaskId : undefined,
    done: progress.done === true,
    failures: toCount(progress.failures),
    conflictReissues: toCount(progress.conflictReissues),
    stamped: toCount(progress.stamped),
    unstampedAtStart:
      typeof progress.unstampedAtStart === 'number' ? progress.unstampedAtStart : undefined,
  };
};

export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      spaces: isRecord(state.spaces)
        ? Object.fromEntries(
            Object.entries(state.spaces).map(([spaceId, progress]) => [
              spaceId,
              toSpaceProgress(progress),
            ])
          )
        : {},
      runs: toCount(state.runs),
      firstRunAt: typeof state.firstRunAt === 'string' ? state.firstRunAt : undefined,
    }),
    schema: schema.object({
      // Keyed by spaceId. Entries for spaces that disappear are dropped on the next run.
      spaces: schema.recordOf(schema.string(), spaceProgressSchema),
      runs: schema.number(),
      firstRunAt: schema.maybe(schema.string()),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const defaultState: LatestTaskStateSchema = {
  spaces: {},
  runs: 0,
  firstRunAt: undefined,
};

export const defaultSpaceProgress: SpaceProgress = {
  window: undefined,
  esTaskId: undefined,
  done: false,
  failures: 0,
  conflictReissues: 0,
  stamped: 0,
  unstampedAtStart: undefined,
};

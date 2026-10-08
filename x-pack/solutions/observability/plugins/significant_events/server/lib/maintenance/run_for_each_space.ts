/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpaceId } from '@kbn/core-spaces-common';
import { toMessage } from './to_message';

/** A per-space step that threw, with the space it was running for. */
export interface ISpaceFailure {
  spaceId: SpaceId;
  error: unknown;
}

/**
 * Runs `run` for every space in order and keeps going when one throws, so a failure in
 * one space cannot leave the later spaces unswept. Returns the failures for the caller to
 * report with `throwSpaceFailures`.
 */
export async function runForEachSpace({
  spaceIds,
  run,
}: {
  spaceIds: Iterable<SpaceId>;
  run: (spaceId: SpaceId) => Promise<void>;
}): Promise<ISpaceFailure[]> {
  const failures: ISpaceFailure[] = [];
  for (const spaceId of spaceIds) {
    try {
      await run(spaceId);
    } catch (error) {
      failures.push({ spaceId, error });
    }
  }
  return failures;
}

/**
 * Throws nothing for an empty list, the original error for one failure, and an
 * `AggregateError` naming every failed space otherwise, so no failed space is hidden
 * behind the first one.
 */
export function throwSpaceFailures(action: string, failures: ISpaceFailure[]): void {
  if (failures.length === 0) {
    return;
  }
  if (failures.length === 1) {
    throw failures[0].error;
  }
  throw new AggregateError(
    failures.map(({ error }) => error),
    `${action} failed in ${failures.length} spaces: ${failures
      .map(({ spaceId, error }) => `"${spaceId}" (${toMessage(error)})`)
      .join(', ')}`
  );
}

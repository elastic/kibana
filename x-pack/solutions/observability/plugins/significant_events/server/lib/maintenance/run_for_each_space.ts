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
 * Runs `run` for every space and keeps going when one throws, so a failure in one space
 * cannot leave the later spaces unswept. Returns the failures for the caller to throw with
 * `throwSpaceFailures`; callers that also want a per-space log line add it themselves.
 */
export async function runForEachSpace({
  spaceIds,
  run,
}: {
  spaceIds: Iterable<SpaceId>;
  run: (spaceId: SpaceId) => Promise<void>;
}): Promise<ISpaceFailure[]> {
  const failures: ISpaceFailure[] = [];
  // Sequential on purpose: each step writes a saved object and calls the workflow API, and a
  // deployment can have up to `xpack.spaces.maxSpaces` spaces, so fanning out would burst them.
  for (const spaceId of spaceIds) {
    try {
      await run(spaceId);
    } catch (error) {
      failures.push({ spaceId, error });
    }
  }
  return failures;
}

const describeFailures = (failures: ISpaceFailure[]): string =>
  failures.map(({ spaceId, error }) => `"${spaceId}" (${toMessage(error)})`).join(', ');

/**
 * Throws nothing for an empty list. Otherwise throws an error that names every failed space,
 * so the failing space is never lost behind the first error: the original error is the
 * `cause` for one failure, an `AggregateError` of all of them for several. `hint` tells the
 * reader what to do about the spaces left behind.
 */
export function throwSpaceFailures({
  action,
  failures,
  hint,
}: {
  action: string;
  failures: ISpaceFailure[];
  hint?: string;
}): void {
  if (failures.length === 0) {
    return;
  }
  const message = `${action} failed in ${
    failures.length === 1 ? 'space' : `${failures.length} spaces`
  }: ${describeFailures(failures)}${hint ? `. ${hint}` : ''}`;
  if (failures.length === 1) {
    throw new Error(message, { cause: failures[0].error });
  }
  throw new AggregateError(
    failures.map(({ error }) => error),
    message
  );
}

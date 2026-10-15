/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { Logger } from '@kbn/core/server';
import type { SpaceSnapshot } from '../../telemetry';

type SpaceOutcome =
  | { kind: 'aborted' }
  | { kind: 'collected'; snapshot: SpaceSnapshot }
  | { kind: 'failed' };

export interface CollectSpaceSnapshotsResult {
  /** Whether the run was aborted before every space was read. */
  aborted: boolean;
  /** Spaces left out because a read failed. */
  failedSpaceCount: number;
  snapshots: SpaceSnapshot[];
}

const isCollected = (
  outcome: SpaceOutcome
): outcome is Extract<SpaceOutcome, { kind: 'collected' }> => outcome.kind === 'collected';

/**
 * Reads every space with at most `concurrency` reads in flight. A space whose read fails is left
 * out and counted; once the run is aborted, no further space is read.
 */
export const collectSpaceSnapshots = async ({
  collect,
  concurrency,
  logger,
  signal,
  spaceIds,
}: {
  collect: (spaceId: string) => Promise<SpaceSnapshot>;
  concurrency: number;
  logger: Logger;
  signal: AbortSignal;
  spaceIds: readonly string[];
}): Promise<CollectSpaceSnapshotsResult> => {
  const outcomes = await pMap(
    spaceIds,
    async (spaceId): Promise<SpaceOutcome> => {
      if (signal.aborted) {
        return { kind: 'aborted' };
      }
      try {
        return { kind: 'collected', snapshot: await collect(spaceId) };
      } catch (error) {
        logger.debug(
          () =>
            `AlertZero telemetry snapshot could not read a space: ${
              error instanceof Error ? error.message : String(error)
            }`
        );
        return { kind: 'failed' };
      }
    },
    { concurrency }
  );

  return {
    aborted: outcomes.some(({ kind }) => kind === 'aborted'),
    failedSpaceCount: outcomes.filter(({ kind }) => kind === 'failed').length,
    snapshots: outcomes.filter(isCollected).map(({ snapshot }) => snapshot),
  };
};

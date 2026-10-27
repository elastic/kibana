/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import pLimit from 'p-limit';
import { setTimeout as sleep } from 'timers/promises';
import type { SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import {
  getSourceWriteConflictReason,
  SourceWriteConflictError,
} from '../errors/source_write_conflict_error';

/** Internal checkpoint and write lease for a source in one space. */
export const SOURCE_KNOWLEDGE_STATE_TYPE = 'nightshift-source-knowledge-state';

interface SourceKnowledgeState {
  revision?: string;
  onboardingScheduled?: boolean;
  lease: { owner: string; expiresAt: number } | null;
}

const stateSchema = schema.object({
  revision: schema.maybe(schema.string({ maxLength: 255 })),
  onboardingScheduled: schema.maybe(schema.boolean()),
  lease: schema.nullable(
    schema.object({
      owner: schema.string({ maxLength: 255 }),
      expiresAt: schema.number(),
    })
  ),
});

/** Stores the applied query revision and serializes cleanup with final KI/rule writes. */
export const sourceKnowledgeStateSavedObjectType: SavedObjectsType = {
  name: SOURCE_KNOWLEDGE_STATE_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: { dynamic: false, properties: {} },
  management: { importableAndExportable: false },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: stateSchema,
        forwardCompatibility: stateSchema.extends({}, { unknowns: 'ignore' }),
      },
    },
  },
};

// Inference runs outside the lease. A stopped writer leaves this grace period for
// its in-flight storage requests to finish before cleanup can acquire the lease.
const WRITE_LEASE_MS = 30 * 60_000;

/** How long a user- or tool-initiated write waits for another write to release the lease. */
export const SOURCE_WRITE_LEASE_WAIT_MS = 5_000;

const LEASE_RETRY_MIN_DELAY_MS = 100;
const LEASE_RETRY_MAX_DELAY_MS = 1_000;

const createLeaseHeldError = () =>
  new SourceWriteConflictError(
    'lease_held',
    'Source knowledge is being updated; retry after the current write finishes'
  );

/** Losing the race to take the lease means another writer holds it. */
const rethrowConflictAsLeaseHeld = (error: unknown): never => {
  if (error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error)) {
    throw createLeaseHeldError();
  }
  throw error;
};

/** Runs `attempt` again, with a growing delay, for as long as it fails on a held lease and `signal` is not aborted. */
const retryWhileLeaseHeld = async <T>(
  maxWaitMs: number,
  attempt: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> => {
  signal?.throwIfAborted();
  const startedAt = Date.now();
  let delayMs = LEASE_RETRY_MIN_DELAY_MS;
  for (;;) {
    try {
      return await attempt();
    } catch (error) {
      const remainingMs = maxWaitMs - (Date.now() - startedAt);
      if (
        getSourceWriteConflictReason(error) !== 'lease_held' ||
        remainingMs <= 0 ||
        signal?.aborted
      ) {
        throw error;
      }
      await sleep(Math.min(delayMs, remainingMs), undefined, { signal }).catch(() => undefined);
      if (signal?.aborted) {
        throw error;
      }
      delayMs = Math.min(delayMs * 2, LEASE_RETRY_MAX_DELAY_MS);
    }
  }
};

/** Coordinates source knowledge mutations across Kibana nodes without holding a lock during inference. */
export interface SourceKnowledgeStateClient {
  /** Runs a final write or cleanup exclusively, preserving a checkpoint across failures. */
  runExclusive<T>(args: {
    sourceId: string;
    run: (
      state: SourceKnowledgeState,
      checkpoint: (state: Partial<SourceKnowledgeState>) => Promise<void>
    ) => Promise<T>;
  }): Promise<T>;
  /**
   * Runs the cleanup of a deleted source, then deletes its state object, which a failed cleanup
   * keeps for the retry.
   */
  retire(args: { sourceId: string; run: () => Promise<void> }): Promise<void>;
  /** Lists the ids of the sources that have a state object, so ones left by a deleted source can be retired. */
  listSourceIds(): Promise<string[]>;
  /** Rejects results of an obsolete query, disabled source, or unfinished invalidation. */
  write<T>(args: {
    sourceId: string;
    expectedRevision?: string;
    /**
     * Lets the write through for a disabled source. Only for operations that remove knowledge:
     * a disabled source keeps its indicators, and users must be able to delete or exclude them
     * without re-enabling it. The revision check and the lease still apply.
     */
    allowDisabled?: boolean;
    /**
     * How long to keep retrying while another write holds the lease. Omitted means fail
     * immediately. A stale revision or a disabled source is never retried.
     */
    waitForLeaseMs?: number;
    /** Stops the wait for the lease, e.g. when the HTTP request is aborted. A write that holds the lease still completes. */
    signal?: AbortSignal;
    run: () => Promise<T>;
  }): Promise<T>;
}

/** Builds a space-scoped coordinator over the engine's internal saved-object repository. */
export const createSourceKnowledgeStateClient = ({
  repository,
  space,
  sourcesClient,
}: {
  repository: SavedObjectsClientContract;
  space: string;
  sourcesClient: SourcesClient;
}): SourceKnowledgeStateClient => {
  const runExclusive = async <T>({
    sourceId,
    run,
    deleteWhenDone = false,
  }: {
    sourceId: string;
    run: (
      state: SourceKnowledgeState,
      checkpoint: (state: Partial<SourceKnowledgeState>) => Promise<void>
    ) => Promise<T>;
    deleteWhenDone?: boolean;
  }): Promise<T> => {
    let stored;
    try {
      stored = await repository.get<SourceKnowledgeState>(SOURCE_KNOWLEDGE_STATE_TYPE, sourceId, {
        namespace: space,
      });
    } catch (error) {
      if (!(error instanceof Error) || !SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }
    if (stored?.attributes.lease && stored.attributes.lease.expiresAt > Date.now()) {
      throw createLeaseHeldError();
    }
    const lease = { owner: randomUUID(), expiresAt: Date.now() + WRITE_LEASE_MS };
    let state: SourceKnowledgeState = { ...stored?.attributes, lease };
    const locked = await (stored
      ? repository.update<SourceKnowledgeState>(
          SOURCE_KNOWLEDGE_STATE_TYPE,
          sourceId,
          { lease },
          { namespace: space, version: stored.version }
        )
      : repository.create<SourceKnowledgeState>(SOURCE_KNOWLEDGE_STATE_TYPE, state, {
          id: sourceId,
          namespace: space,
          overwrite: false,
        })
    ).catch(rethrowConflictAsLeaseHeld);
    let version = locked.version;
    const serializeCheckpoint = pLimit(1);
    const checkpoint = (patch: Partial<SourceKnowledgeState>): Promise<void> =>
      serializeCheckpoint(async () => {
        const updated = await repository.update<SourceKnowledgeState>(
          SOURCE_KNOWLEDGE_STATE_TYPE,
          sourceId,
          patch,
          { namespace: space, version }
        );
        state = { ...state, ...patch };
        version = updated.version;
      });
    let renewalError: unknown;
    const renewal = setInterval(() => {
      void checkpoint({ lease: { ...lease, expiresAt: Date.now() + WRITE_LEASE_MS } }).catch(
        (error) => {
          renewalError = error;
        }
      );
    }, WRITE_LEASE_MS / 3);
    renewal.unref();
    let succeeded = false;
    try {
      const result = await run(state, checkpoint);
      if (renewalError !== undefined) {
        throw renewalError;
      }
      succeeded = true;
      return result;
    } finally {
      clearInterval(renewal);
      if (succeeded && deleteWhenDone) {
        // Deleted while the lease is still held, so no other write can own the object by then.
        await serializeCheckpoint(() =>
          repository.delete(SOURCE_KNOWLEDGE_STATE_TYPE, sourceId, { namespace: space })
        ).catch(async (error) => {
          // A lease left behind would turn every retry into a 409 until it expires. If releasing
          // it fails too, the delete error is the one worth reporting.
          await checkpoint({ lease: null }).catch(() => {});
          throw error;
        });
      } else {
        await checkpoint({ lease: null });
      }
    }
  };

  const writeOnce: SourceKnowledgeStateClient['write'] = ({
    sourceId,
    expectedRevision,
    allowDisabled = false,
    run,
  }) =>
    runExclusive({
      sourceId,
      run: async (state, checkpoint) => {
        const { source } = await sourcesClient.get(sourceId);
        if (!source.enabled && !allowDisabled) {
          throw new SourceWriteConflictError(
            'source_disabled',
            'The source is disabled; enable it before writing results'
          );
        }
        if (expectedRevision !== undefined && expectedRevision !== source.esql_updated_at) {
          throw new SourceWriteConflictError(
            'stale_revision',
            'The source query changed since this request was prepared; reload and try again'
          );
        }
        if (state.revision !== undefined && state.revision !== source.esql_updated_at) {
          throw new SourceWriteConflictError(
            'reconcile_pending',
            'The source query changed and its knowledge is still being reset; retry shortly'
          );
        }
        if (state.revision === undefined) {
          await checkpoint({ revision: source.esql_updated_at, onboardingScheduled: false });
        }
        return run();
      },
    });

  return {
    runExclusive,
    retire: ({ sourceId, run }) => runExclusive({ sourceId, run, deleteWhenDone: true }),
    listSourceIds: async () => {
      const finder = repository.createPointInTimeFinder({
        type: SOURCE_KNOWLEDGE_STATE_TYPE,
        namespaces: [space],
        fields: [],
      });
      const sourceIds: string[] = [];
      try {
        for await (const { saved_objects: objects } of finder.find()) {
          sourceIds.push(...objects.map(({ id }) => id));
        }
      } finally {
        await finder.close();
      }
      return sourceIds;
    },
    write: ({ waitForLeaseMs = 0, signal, ...args }) =>
      retryWhileLeaseHeld(waitForLeaseMs, () => writeOnce(args), signal),
  };
};

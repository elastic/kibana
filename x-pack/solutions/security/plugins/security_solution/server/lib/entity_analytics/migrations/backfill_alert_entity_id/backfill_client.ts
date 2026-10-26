/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldCapsResponse,
  QueryDslBoolQuery,
  QueryDslQueryContainer,
  UpdateByQueryResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { getEuidPainlessSourceUpdateScript } from '@kbn/entity-store/common/domain/euid/painless';

import { ALERT_ENTITY_ID } from '../../../../../common/field_maps/field_names';
import { getEntityAnalyticsEntityTypes } from '../../../../../common/entity_analytics/utils';
import type { Range } from '../../../../../common/entity_analytics/risk_engine';
import { retryTransientEsErrors } from '../../utils/retry_transient_es_errors';

export interface TargetIndices {
  /** Concrete indices we can write the field to. */
  usable: Set<string>;
  /** Concrete indices that exist but are read-only or missing the mapping. */
  unusable: number;
}

/**
 * Selects alerts inside the pinned window that have no EUID stamped yet.
 * Filters for indices that the backfill can write to.
 *
 * What makes a pass self-limiting, and a reissued request safe: every alert stamped leaves the
 * result set for good, so a new request picks up exactly what the previous one did not reach.
 */
export const buildBackfillQuery = (
  window: Range,
  usableIndices: Set<string>
): { bool: QueryDslBoolQuery } => {
  const { bool } = buildUnstampedAlertsQuery(window);

  return {
    bool: {
      ...bool,
      filter: [
        ...(Array.isArray(bool.filter) ? bool.filter : [bool.filter]),
        // Restricted here rather than left to the update to fail, so alerts in indices we cannot
        // write to are never matched and the script never runs against them.
        { terms: { _index: [...usableIndices] } },
      ],
    },
  };
};

/**
 * Every alert inside the window that still needs an EUID, wherever it lives.
 */
export const buildUnstampedAlertsQuery = (window: Range): { bool: QueryDslBoolQuery } => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: window.start, lt: window.end } } },
      {
        bool: {
          should: getEntityAnalyticsEntityTypes().map((entityType) =>
            euid.dsl.getEuidDocumentsContainsIdFilter(getBuiltInEntityDefinition(entityType))
          ),
          minimum_should_match: 1,
        },
      },
    ],
    must_not: [{ exists: { field: ALERT_ENTITY_ID } }],
  },
});

/**
 * The concrete indices behind the alias that can actually be updated, filtering out those blocked
 * from writing and those without `ALERT_ENTITY_ID` in their mapping.
 *
 * The mapping should always be there — the alerting framework installs it on every concrete index
 * at startup and retries on each restart. It is checked because alerts are mapped `dynamic: false`,
 * so writing the field to an index that lacks it would succeed and then be invisible to scoring.
 */
export const resolveTargetIndices = async ({
  esClient,
  logger,
  alertsIndex,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  alertsIndex: string;
  signal: AbortSignal;
}): Promise<TargetIndices> => {
  const usable = new Set<string>();
  const readOnly: string[] = [];
  const unmapped: string[] = [];

  // A space can have no alerts index at all — the risk engine may be enabled before any rule has
  // run there. `ignore_unavailable` covers a missing member of an existing alias, but not an alias
  // that has never existed, which still answers 404. Treated as "nothing to back fill" rather than
  // an error, so such a space is retired instead of failing three times and being abandoned.
  const emptyWhenMissing = async <T>(read: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await retryTransientEsErrors(read, { logger });
    } catch (e) {
      if (e?.meta?.statusCode === 404) {
        return fallback;
      }
      throw e;
    }
  };

  // using fieldCaps instead of the field mapping API because it is available in serverless.
  const [fieldCaps, settings] = await Promise.all([
    emptyWhenMissing<FieldCapsResponse>(
      () =>
        esClient.fieldCaps(
          {
            index: alertsIndex,
            fields: [ALERT_ENTITY_ID],
            include_unmapped: true,
            ignore_unavailable: true,
            allow_no_indices: true,
          },
          { signal }
        ),
      { indices: [], fields: {} }
    ),
    emptyWhenMissing(
      () =>
        esClient.indices.getSettings(
          {
            index: alertsIndex,
            flat_settings: true,
            ignore_unavailable: true,
            allow_no_indices: true,
          },
          { signal }
        ),
      {}
    ),
  ]);

  // The field is absent from the response when no index maps it, and lists the indices lacking it
  // under `unmapped` when only some do.
  const entityIdCaps = fieldCaps.fields[ALERT_ENTITY_ID];
  const unmappedIndices = new Set(entityIdCaps?.unmapped?.indices);
  const isMapped = (index: string): boolean =>
    entityIdCaps !== undefined && !unmappedIndices.has(index);

  for (const [index, indexSettings] of Object.entries(settings)) {
    const flat = indexSettings.settings as Record<string, string> | undefined;
    const writeBlocked =
      flat?.['index.blocks.write'] === 'true' ||
      flat?.['index.blocks.read_only'] === 'true' ||
      flat?.['index.blocks.read_only_allow_delete'] === 'true';

    if (writeBlocked) {
      readOnly.push(index);
    } else if (!isMapped(index)) {
      unmapped.push(index);
    } else {
      usable.add(index);
    }
  }

  if (readOnly.length > 0) {
    logger.warn(`Skipping ${readOnly.length} read-only alert index(es): ${readOnly.join(', ')}`);
  }

  if (unmapped.length > 0) {
    logger.warn(
      `Skipping ${
        unmapped.length
      } alert index(es) without the "${ALERT_ENTITY_ID}" mapping: ${unmapped.join(
        ', '
      )}. Their alerts keep using the risk scoring fallback.`
    );
  }

  return { usable, unusable: readOnly.length + unmapped.length };
};

/** How many alerts are still waiting to be stamped, used to decide which space to run first. */
export const countPendingAlerts = async ({
  esClient,
  logger,
  alertsIndex,
  query,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  alertsIndex: string;
  query: QueryDslQueryContainer;
  signal: AbortSignal;
}): Promise<number> => {
  const response = await retryTransientEsErrors(
    () =>
      esClient.count(
        {
          index: alertsIndex,
          query,
          ignore_unavailable: true,
          allow_no_indices: true,
        },
        { signal }
      ),
    { logger }
  );

  return response.count;
};

/**
 * Starts the update-by-query for one space and returns the Elasticsearch task running it.
 *
 * Deliberately asynchronous: a window of millions of alerts takes far longer than a Kibana task
 * may run for, and the request keeps going in Elasticsearch regardless of what this Kibana node
 * does afterwards. Progress is recovered by polling the returned id.
 */
export const startBackfill = async ({
  esClient,
  logger,
  alertsIndex,
  query,
  alertsPerSecond,
  maxDocs,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  alertsIndex: string;
  query: QueryDslQueryContainer;
  alertsPerSecond: number;
  maxDocs: number;
  signal: AbortSignal;
}): Promise<string | undefined> => {
  const script = getEuidPainlessSourceUpdateScript(
    getEntityAnalyticsEntityTypes().map((entityType) => getBuiltInEntityDefinition(entityType)),
    // Alert `_source` stores `kibana.alert.*` as flattened dotted keys — the rule-execution
    // enrichment writes `_source[ALERT_ENTITY_ID]` the same way. Do not unflatten here.
    `ctx._source['${ALERT_ENTITY_ID}'] = euids;`
  );

  const response = await esClient.updateByQuery(
    {
      index: alertsIndex,
      query,
      script: { lang: 'painless', source: script },
      // Alerts are modified concurrently by rule execution and by workflow status changes; a
      // document that moved under us is re-read on the next pass rather than failing this one.
      conflicts: 'proceed',
      // Refreshes the shards it touched once the request finishes, so the next request sees
      // what this one stamped and matches only what is left.
      refresh: true,
      requests_per_second: alertsPerSecond,
      // Bounds the transient disk growth and the running time of any one request; whatever is
      // left over is picked up by the next one, which the query naturally excludes already.
      max_docs: maxDocs,
      wait_for_completion: false,
      ignore_unavailable: true,
      allow_no_indices: true,
    },
    { signal }
  );

  return typeof response.task === 'string' ? response.task : undefined;
};

/**
 * Drops a finished update-by-query's stored result from the `.tasks` index.
 *
 * `wait_for_completion: false` means Elasticsearch keeps the result until someone deletes it, and
 * nothing expires it, so every request this task issues leaves a document behind for good.
 *
 * Best effort. Tidying up must never affect whether a backfill succeeds.
 */
const deleteTaskResult = async ({
  esClient,
  logger,
  esTaskId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  esTaskId: string;
}): Promise<void> => {
  try {
    await esClient.delete({ index: '.tasks', id: esTaskId });
  } catch (e) {
    const statusCode = e?.meta?.statusCode ?? e?.statusCode;
    // Already gone, which is the state this was trying to reach.
    if (statusCode === 404) {
      return;
    }

    logger.warn(
      `Could not delete the stored result of task "${esTaskId}" from the .tasks index: ${e.message}`
    );
  }
};

/**
 * Asks Elasticsearch to stop a running update-by-query.
 */
export const cancelBackfill = async ({
  esClient,
  logger,
  esTaskId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  esTaskId: string;
  signal: AbortSignal;
}): Promise<void> => {
  try {
    await esClient.tasks.cancel({ task_id: esTaskId }, { signal });
    // A cancelled request stores a result too, and this one is certain to go unread.
    await deleteTaskResult({ esClient, logger, esTaskId });
  } catch (e) {
    // Already finished, already cancelled, or the node running it is gone. Nothing left to stop.
    if (e?.meta?.statusCode === 404) {
      return;
    }
    logger.warn(`Could not cancel update-by-query task "${esTaskId}": ${e.message}`);
  }
};

export interface BackfillProgress {
  completed: boolean;
  updated: number;
  /** Alerts the request matched when it started — what `updated` is counting towards. */
  total: number;
  /**
   * Alerts the request stepped over because something else wrote them first. `conflicts: proceed`
   * means these are skipped rather than retried and do not make the request fail, so a completed
   * request with a non-zero count has left alerts unstamped.
   */
  versionConflicts: number;
  /** True when the task id no longer resolves, so the request has to be started again. */
  vanished: boolean;
  /**
   * True when the request's search timed out part way through. Elasticsearch still reports the
   * request as completed, so without this a request that never reached most of its alerts is
   * indistinguishable from one that finished them.
   */
  timedOut: boolean;
  /**
   * Alerts the script declined to stamp because no entity id could be derived from them.
   */
  noops: number;
  /** Bulk writes Elasticsearch retried itself, which is the cluster pushing back. */
  bulkRetries: number;
  failures: string[];
}

/**
 * The counters a running update-by-query reports.
 * Elasticsearch keeps this status live as batches complete, then builds the response from the final one.
 */
type UpdateByQueryTaskStatus = Pick<
  UpdateByQueryResponse,
  'total' | 'updated' | 'version_conflicts' | 'noops' | 'retries'
>;

export class BackfillRequestFailedError extends Error {
  // Alerts the request stamped before it failed.
  public readonly updated: number;

  constructor(message: string, updated: number) {
    super(message);
    this.updated = updated;
  }
}

/**
 * Reads the state of a running update-by-query.
 *
 * A task id stops resolving if the node running it restarted or someone cancelled it. That is
 * reported rather than treated as completion, because the alerts it had not reached yet are still
 * unstamped and the request has to be reissued.
 */
export const pollBackfill = async ({
  esClient,
  logger,
  esTaskId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  esTaskId: string;
  signal: AbortSignal;
}): Promise<BackfillProgress> => {
  try {
    const task = await retryTransientEsErrors(
      () => esClient.tasks.get({ task_id: esTaskId, wait_for_completion: false }, { signal }),
      { logger }
    );

    const status = task.task?.status as UpdateByQueryTaskStatus | undefined;
    // The id always comes from `startBackfill`, and the Tasks API stores the operation's own
    // response — here the update-by-query's — under `response`
    const response = task.response as UpdateByQueryResponse | undefined;
    // Preferred from the response because that shape is documented. There is
    // no response until the request finishes, so a running one is read from its live status.
    const counts = response ?? status;

    if (task.completed === true) {
      // Everything this read needs is already in hand, and a finished request is read for the last time.
      // Drop the task result to avoid accumulating stale documents in the .tasks index.
      await deleteTaskResult({ esClient, logger, esTaskId });
    }

    if (task.error) {
      throw new BackfillRequestFailedError(
        `task "${esTaskId}" returned error: ${task.error.type} - ${
          task.error.reason ?? 'no reason given'
        }`,
        counts?.updated ?? 0
      );
    }

    const failures = (response?.failures ?? []).map((failure) => JSON.stringify(failure));

    return {
      completed: task.completed === true,
      updated: counts?.updated ?? 0,
      total: counts?.total ?? 0,
      versionConflicts: counts?.version_conflicts ?? 0,
      vanished: false,
      timedOut: response?.timed_out === true,
      noops: counts?.noops ?? 0,
      bulkRetries: counts?.retries?.bulk ?? 0,
      failures,
    };
  } catch (e) {
    if (e?.meta?.statusCode === 404) {
      logger.warn(
        `Update-by-query task "${esTaskId}" no longer exists; its alerts will be picked up by a new request.`
      );
      return {
        completed: false,
        updated: 0,
        total: 0,
        versionConflicts: 0,
        vanished: true,
        timedOut: false,
        noops: 0,
        bulkRetries: 0,
        failures: [],
      };
    }
    throw e;
  }
};

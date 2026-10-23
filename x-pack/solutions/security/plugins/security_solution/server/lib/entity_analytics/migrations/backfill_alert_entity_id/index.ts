/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server/task';
import { getDeleteTaskRunResult, TaskPriority } from '@kbn/task-manager-plugin/server/task';

import type { EntityStoreStartContract } from '@kbn/entity-store/server';
import type { EntityAnalyticsMigrationsParams } from '..';

import type { RiskEngineConfiguration } from '../../types';
import type { Range } from '../../../../../common/entity_analytics/risk_engine';
import { RISK_SCORE_MAINTAINER_ID } from '../../../../../common/entity_analytics/risk_score/constants';
import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import { riskEngineConfigurationTypeName } from '../../risk_engine/saved_object';
import { convertRangeToISO } from '../../risk_score/tasks/helpers';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from '../../execution_context';
import { ALERT_ENTITY_ID_BACKFILL_COMPLETED_EVENT } from '../../../telemetry/event_based/events/entity_analytics';
import {
  MAX_CONFLICT_REISSUES,
  MAX_DOCS_PER_REQUEST,
  MIN_RUN_INTERVAL_MS,
  MAX_CONSECUTIVE_SPACE_FAILURES,
  MAX_RUNS,
  MAX_SPACES,
  RUN_INTERVAL_MS,
  TARGET_ALERTS_PER_SECOND,
  LOGGER_NAME,
  MAX_LOOKBACK_MS,
  TASK_ID,
  TASK_SCOPE,
  TASK_TIMEOUT,
  TASK_TYPE,
  UNKNOWN_ALERT_COUNT,
} from './constants';
import type { BackfillProgress } from './backfill_client';
import {
  BackfillRequestFailedError,
  buildBackfillQuery,
  buildUnstampedAlertsQuery,
  cancelBackfill,
  countPendingAlerts,
  pollBackfill,
  resolveTargetIndices,
  startBackfill,
} from './backfill_client';
import {
  defaultSpaceProgress,
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema,
  type SpaceProgress,
} from './state';

const DEFAULT_RANGE: Range = { start: 'now-30d', end: 'now' };

interface ConfiguredSpace {
  spaceId: string;
  range: Range;
}

/**
 * How long the request has left at the rate we throttle it to, clamped to the polling bounds.
 *
 * `total` is 0 until the request reports its first batch, so an estimate that cannot be made
 * falls back to the normal interval rather than guessing. The rate is taken from the constant we
 * start requests with
 */
const nextPollDelayMs = ({ total, updated }: BackfillProgress): number => {
  if (total <= updated) {
    return RUN_INTERVAL_MS;
  }

  // A small margin so the poll lands after the request finishes rather than just before it.
  const remainingMs = ((total - updated) / TARGET_ALERTS_PER_SECOND) * 1_000 + MIN_RUN_INTERVAL_MS;

  return Math.min(Math.max(remainingMs, MIN_RUN_INTERVAL_MS), RUN_INTERVAL_MS);
};

/**
 * Every space with a risk engine configuration, each with the scoring window it specifies.
 *
 * A candidate list only — nothing is filtered here. Whether risk scoring actually runs in a space
 * is decided by {@link advanceSpace} when that space takes its turn, because the maintainer status
 * is per-namespace and checking it while listing would cost a read per space on every run.
 */
const findSpacesRiskEngineConfig = async (
  coreStart: CoreStart,
  logger: Logger
): Promise<ConfiguredSpace[]> => {
  const repository = coreStart.savedObjects.createInternalRepository();
  // Partial: saved objects written by older versions may predate fields this code reads.
  const response = await repository.find<Partial<RiskEngineConfiguration>>({
    type: riskEngineConfigurationTypeName,
    perPage: MAX_SPACES,
    namespaces: ['*'],
  });

  if (response.total > MAX_SPACES) {
    logger.warn(
      `${response.total} spaces have risk engine configured, more than the ${MAX_SPACES} this task backfills. The remaining spaces keep using the risk scoring fallback.`
    );
  }

  return response.saved_objects.flatMap((savedObject) => {
    const spaceId = savedObject.namespaces?.[0];
    if (spaceId === undefined) {
      return [];
    }
    return [{ spaceId, range: savedObject.attributes.range ?? DEFAULT_RANGE }];
  });
};

/**
 * Resolves the configured risk engine range to absolute timestamps and clamps its start to `maxLookback`.
 *
 * Absolute because the result is stored and reused for the whole of a space's backfill. Left as
 * date math, `now-30d` would resolve afresh on every request,.
 *
 * `configuration.range` has no upper bound in the API, so the clamp keeps the amount of data a
 * backfill touches predictable regardless of how a space is configured.
 */
const resolveBackfillWindow = ({
  range,
  maxLookbackMs,
  now,
}: {
  range: Range;
  maxLookbackMs: number;
  now: number;
}): Range => {
  const absolute = convertRangeToISO(range);
  const earliest = new Date(now - maxLookbackMs).toISOString();

  return {
    start: absolute.start < earliest ? earliest : absolute.start,
    end: absolute.end,
  };
};

/**
 * Decides what one space needs next and does it: start its update-by-query, or report on the one
 * already running.
 *
 * Returns the space's new progress. Throwing is left to the caller to count as a failure.
 */
const advanceSpace = async ({
  esClient,
  logger,
  entityStore,
  spaceId,
  window,
  progress,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  entityStore: EntityStoreStartContract;
  spaceId: string;
  window: Range;
  progress: SpaceProgress;
  signal: AbortSignal;
}) => {
  const alertsIndex = getAlertsIndex(spaceId);

  if (progress.esTaskId !== undefined) {
    const backfill = await pollBackfill({
      esClient,
      logger,
      esTaskId: progress.esTaskId,
      signal,
    });
    const {
      completed,
      updated,
      total,
      versionConflicts,
      vanished,
      timedOut,
      noops,
      bulkRetries,
      failures,
    } = backfill;

    if (vanished) {
      // Dropping the id reissues the request next run; alerts already stamped are excluded by the
      // query, so the reissued request picks up exactly what the lost one had not reached.
      return { progress: { ...progress, window, esTaskId: undefined } };
    }

    if (!completed) {
      // Left out of `stamped`, which only counts finished requests — a reissued request restarts
      // its own count from zero, so folding an in-flight figure in would make the total regress.
      logger.debug(
        `Backfill in progress for space "${spaceId}": ${updated} of ${total} alerts stamped.`
      );
      return {
        // if the request had a failure but then started to stamp without failing, the failures is reset to 0
        progress: { ...progress, window, failures: updated > 0 ? 0 : progress.failures },
        nextPollMs: nextPollDelayMs(backfill),
      };
    }

    if (timedOut) {
      // Elasticsearch reports a timed-out request as completed, so treating this as a finished
      // pass would retire the space having never reached most of its alerts. Thrown like a
      // document failure: the next run reissues over what is left, and three in a row give up.
      throw new BackfillRequestFailedError(
        `update-by-query timed out having stamped ${updated} of ${total} alert(s)`,
        updated
      );
    }

    if (failures.length > 0) {
      throw new BackfillRequestFailedError(
        `update-by-query reported ${failures.length} document failure(s): ${failures
          .slice(0, 3)
          .join('; ')}`,
        updated
      );
    }

    const stamped = progress.stamped + updated;

    // `conflicts: proceed` steps over alerts another writer held rather than retrying them, and
    // the request still completes. Those alerts are unstamped, and they are the newest ones — the
    // ones rule execution and workflow status changes are still touching — so reissue rather than
    // call the space finished.
    if (versionConflicts > 0 && progress.conflictReissues < MAX_CONFLICT_REISSUES) {
      logger.info(
        `Backfill for space "${spaceId}" stamped ${updated} alerts and stepped over ${versionConflicts} held by another writer. Reissuing.`
      );
      return {
        progress: {
          ...progress,
          window,
          esTaskId: undefined,
          failures: 0,
          conflictReissues: progress.conflictReissues + 1,
          stamped,
        },
      };
    }

    if (versionConflicts > 0) {
      logger.warn(
        `Backfill for space "${spaceId}" gave up on ${versionConflicts} alert(s) still held by another writer after ${progress.conflictReissues} reissue(s). They keep using the risk scoring fallback.`
      );
    }

    // Requests are capped at MAX_DOCS_PER_REQUEST, so completing does not mean finishing. `total`
    // is what the request set out to process — `min(matching, max_docs)` — so reaching the cap
    // means more may be left.
    const cappedOut = total >= MAX_DOCS_PER_REQUEST;

    if (cappedOut && updated > 0) {
      logger.info(
        `Backfill for space "${spaceId}" stamped ${updated} alerts and reached the per-request cap. Reissuing.`
      );
      return {
        progress: { ...progress, window, esTaskId: undefined, failures: 0, stamped },
      };
    }

    if (cappedOut) {
      // A full request that stamped nothing would repeat forever. Treated as a failure so the
      // per-space budget abandons the space rather than looping on it.
      throw new Error(
        `Update-by-query for "${alertsIndex}" processed ${total} alerts and stamped none of them`
      );
    }

    logger.info(
      `Backfill complete for space "${spaceId}". Alerts stamped: ${stamped}. Last request: total=${total} noops=${noops} version_conflicts=${versionConflicts} bulk_retries=${bulkRetries}.`
    );
    // A finished space needs neither its window nor its task id again; dropping them keeps the
    // task state small on deployments with many spaces, where it is rewritten on every run.
    return {
      progress: {
        window: undefined,
        esTaskId: undefined,
        done: true,
        failures: 0,
        conflictReissues: progress.conflictReissues,
        stamped,
        unstampedAtStart: progress.unstampedAtStart,
      },
    };
  }

  // Whether risk scoring actually runs in this space. `taskStatus === 'started'` is the same
  // predicate the Entity Analytics management page calls "enabled", because the toggle starts and
  // stops this maintainer.
  //
  // Deliberately not the risk engine's own `enabled` flag: that belongs to the V1 scoring task,
  // and the V2 maintainer never reads it.
  const [maintainer] = await entityStore.getMaintainerStatus(spaceId, [RISK_SCORE_MAINTAINER_ID]);
  if (maintainer?.taskStatus !== 'started') {
    logger.debug(
      `Risk scoring is ${
        maintainer?.taskStatus ?? 'never_started'
      } for space "${spaceId}"; nothing to speed up.`
    );
    return { progress: { ...progress, window: undefined, done: true, failures: 0 } };
  }

  const { usable, unusable } = await resolveTargetIndices({
    esClient,
    logger,
    alertsIndex,
    signal,
  });

  // No alerts index for this space yet — a risk engine can be enabled before any rule has run.
  // Nothing to back fill, so the pass is complete rather than failed.
  if (usable.size === 0 && unusable === 0) {
    logger.debug(`No alert indices for "${alertsIndex}" yet; nothing to back fill.`);
    return { progress: { ...progress, window: undefined, done: true, failures: 0 } };
  }

  // Indices exist but none can be written to. Thrown rather than reported as a finished pass: the
  // usual cause is a disk flood-stage watermark blocking writes, which clears on its own and which
  // a heavy backfill can itself provoke.
  if (usable.size === 0) {
    throw new Error(`No writable alert indices for "${alertsIndex}"`);
  }

  const query = buildBackfillQuery(window, usable);
  // Best effort: this only reports how much is left. Letting it throw would count a failure
  // against a space whose backfill was about to start perfectly well, and three of those
  // abandon the space.
  const pending = await countPendingAlerts({ esClient, logger, alertsIndex, query, signal }).catch(
    (e) => {
      logger.debug(`Could not count pending alerts for "${alertsIndex}": ${e.message}`);
      return undefined;
    }
  );

  // Nothing to stamp, so there is no point submitting a request that would match nothing. This is
  // the common case once a backfill has run: Task Manager reschedules the task on every Kibana
  // restart, and retiring finished spaces outright is what keeps that re-run free.
  if (pending === 0) {
    logger.debug(`No alerts left to stamp for space "${spaceId}".`);
    return { progress: { ...progress, window: undefined, done: true, failures: 0 } };
  }

  // Counted once, on the first request. A later one is a reissue over what earlier ones left
  let unstampedAtStart = progress.unstampedAtStart;
  if (unstampedAtStart === undefined) {
    unstampedAtStart = await countPendingAlerts({
      esClient,
      logger,
      alertsIndex,
      query: buildUnstampedAlertsQuery(window),
      signal,
    }).catch((e) => {
      logger.debug(`Could not count unstamped alerts for "${alertsIndex}": ${e.message}`);
      return UNKNOWN_ALERT_COUNT;
    });
  }

  const esTaskId = await startBackfill({
    esClient,
    logger,
    alertsIndex,
    query,
    alertsPerSecond: TARGET_ALERTS_PER_SECOND,
    maxDocs: MAX_DOCS_PER_REQUEST,
    signal,
  });

  if (esTaskId === undefined) {
    throw new Error(`Update-by-query for "${alertsIndex}" returned no task id`);
  }

  logger.info(
    `Started backfill for space "${spaceId}" as task ${esTaskId}.${
      pending === undefined ? '' : ` Alerts left to stamp: ${pending}.`
    }`
  );
  return { progress: { ...progress, window, esTaskId, unstampedAtStart } };
};

interface SpaceRequestsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaces: Record<string, SpaceProgress>;
  signal: AbortSignal;
}

/**
 * Stops whichever of `spaces` have an update-by-query running.
 */
const cancelRunningRequests = async ({ esClient, logger, spaces, signal }: SpaceRequestsParams) => {
  for (const [spaceId, { esTaskId }] of Object.entries(spaces)) {
    if (esTaskId !== undefined) {
      logger.info(`Cancelling the update-by-query still running for space "${spaceId}".`);
      await cancelBackfill({ esClient, logger, esTaskId, signal });
    }
  }
};

/**
 * Removes the task, stopping every update-by-query it has running first.
 */
const removeTask = async (params: SpaceRequestsParams) => {
  await cancelRunningRequests(params);

  return getDeleteTaskRunResult();
};

export const runBackfillTask = async ({
  coreStart,
  logger,
  entityStore,
  enabled,
  state,
  signal,
}: {
  coreStart: CoreStart;
  logger: Logger;
  entityStore: EntityStoreStartContract;
  enabled: boolean;
  state: LatestTaskStateSchema;
  signal: AbortSignal;
}) => {
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  // Read on every run, not only at scheduling: deleting the task document does not stop this for
  // good, because `ensureScheduled` recreates it on the next Kibana restart. This is the only way
  // to halt a backfill that is already under way and keep it halted.
  if (!enabled) {
    logger.info(
      `Task "${TASK_TYPE}" is disabled by configuration; removing the task. Alerts that were not stamped keep using the risk scoring fallback.`
    );
    return removeTask({ esClient, logger, spaces: state.spaces, signal });
  }

  const startedAt = Date.now();

  const configuredSpaces = await findSpacesRiskEngineConfig(coreStart, logger);

  // Rebuilt against the live space list rather than carried over, so the task is not kept alive
  // waiting on a space that no longer exists, and spaces created since the last run pick up a
  // default.
  const spaces: Record<string, SpaceProgress> = {};
  for (const { spaceId } of configuredSpaces) {
    spaces[spaceId] = state.spaces[spaceId] ?? { ...defaultSpaceProgress };
  }

  if (configuredSpaces.length === 0) {
    logger.info(
      `Task "${TASK_TYPE}" found no spaces with a risk engine configuration; removing the task.`
    );
    return removeTask({ esClient, logger, spaces: state.spaces, signal });
  }

  // prevent started backfill to continue running for spaces that no longer exist
  const configuredSpaceIds = new Set(configuredSpaces.map(({ spaceId }) => spaceId));
  const droppedSpaces = Object.fromEntries(
    Object.entries(state.spaces).filter(([spaceId]) => !configuredSpaceIds.has(spaceId))
  );
  if (Object.keys(droppedSpaces).length > 0) {
    logger.info(
      `Cancelling the running backfill for dropped spaces: ${Object.keys(droppedSpaces).join(', ')}`
    );
    await cancelRunningRequests({ esClient, logger, spaces: droppedSpaces, signal });
  }
  const pending: ConfiguredSpace[] = [];
  for (const space of configuredSpaces) {
    if (!spaces[space.spaceId].done) {
      pending.push(space);
    }
  }

  // One update-by-query at a time, so the write rate against the alerts indices is the single
  // number we throttle to rather than one that scales with how many spaces a deployment has.
  // Spaces are taken in whatever order they come back in: every one gets backfilled, and
  // deciding which goes first would cost a count per space for an ordering most deployments —
  // over half of which have a single space — cannot benefit from.
  //
  // A space already under way goes first. Either:
  // - one with a request in flight, so that request is polled
  // - one that has started but is between requests, so it finishes rather than being overtaken by an untouched space.
  // The other spaces are added to the queue so they can start their backfill if the space currently being processed has already finished the backfill.
  let inFlight: ConfiguredSpace | undefined;
  let started: ConfiguredSpace | undefined;
  for (const space of pending) {
    const progress = spaces[space.spaceId];
    if (inFlight === undefined && progress.esTaskId !== undefined) {
      inFlight = space;
    }
    if (started === undefined && progress.window !== undefined) {
      started = space;
    }
  }
  const first = inFlight ?? started;
  const queue = first ? [first, ...pending.filter((space) => space !== first)] : pending;
  let nextPollMs = RUN_INTERVAL_MS;

  for (const { spaceId, range } of queue) {
    if (signal.aborted) {
      break;
    }

    const progress = spaces[spaceId];
    // Resolved fresh until the space actually starts, so its window ends when its backfill
    // begins rather than whenever this task first ran.
    const window =
      progress.window ??
      resolveBackfillWindow({ range, maxLookbackMs: MAX_LOOKBACK_MS, now: startedAt });

    try {
      const advanced = await advanceSpace({
        esClient,
        logger,
        entityStore,
        spaceId,
        window,
        progress,
        signal,
      });
      spaces[spaceId] = advanced.progress;
      nextPollMs = advanced.nextPollMs ?? RUN_INTERVAL_MS;

      // Only a space that was retired releases the slot. One that started a request, is polling
      // one, or needs another after a capped or conflicted request keeps it.
      if (!spaces[spaceId].done) {
        break;
      }
    } catch (e) {
      const failures = progress.failures + 1;
      const exhaustedRetries = failures >= MAX_CONSECUTIVE_SPACE_FAILURES;

      logger.error(
        `Error backfilling "${TASK_TYPE}" for space "${spaceId}" (failure ${failures} of ${MAX_CONSECUTIVE_SPACE_FAILURES}): ${e.message}`
      );

      if (exhaustedRetries) {
        // Give up rather than keep the task alive forever. Scoring still derives the EUID for these
        // alerts, so the cost is slower scoring, not wrong scores.
        logger.warn(
          `Giving up on space "${spaceId}" after ${failures} consecutive failures. Its alerts keep using the risk scoring fallback.`
        );
      }

      // When task polling returns an error, the task is done, so the task id is dropped so a new request can be started.
      const esTaskId = e instanceof BackfillRequestFailedError ? undefined : progress.esTaskId;
      // A request that failed part way still stamped what it got through, and those alerts stay
      // stamped, so they are counted rather than lost to the throw.
      const stamped =
        e instanceof BackfillRequestFailedError ? progress.stamped + e.updated : progress.stamped;

      spaces[spaceId] = {
        ...progress,
        window,
        esTaskId,
        failures,
        stamped,
        done: exhaustedRetries,
      };
      break;
    }
  }

  const firstRunAt = state.firstRunAt ?? new Date(startedAt).toISOString();
  const progresses = Object.values(spaces);
  const updatedState: LatestTaskStateSchema = { spaces, runs: state.runs + 1, firstRunAt };
  const remaining = progresses.filter(({ done }) => !done).length;
  const totalStamped = progresses.reduce((sum, { stamped }) => sum + stamped, 0);
  const totalLeftUnstamped = progresses.reduce(
    (sum, { unstampedAtStart, stamped }) =>
      unstampedAtStart === undefined || unstampedAtStart === UNKNOWN_ALERT_COUNT
        ? sum
        : sum + Math.max(0, unstampedAtStart - stamped),
    0
  );
  // Counts spaces that have an unknown alert count so that the total left unstamped is not
  // understated. A space with no count is only a true zero if it retired of its own accord —
  // nothing left to stamp, or no alerts index yet. One still unfinished, or given up on before
  // its alerts were ever counted, has a backlog nobody measured.
  const spacesWithUnknownAlertCount = progresses.filter(
    ({ done, failures, unstampedAtStart }) =>
      unstampedAtStart === UNKNOWN_ALERT_COUNT ||
      (unstampedAtStart === undefined && (!done || failures >= MAX_CONSECUTIVE_SPACE_FAILURES))
  ).length;
  logTaskCompletion({ logger, taskRuns: updatedState.runs, spaces, progresses });

  const abandoned = progresses.filter(
    ({ failures }) => failures >= MAX_CONSECUTIVE_SPACE_FAILURES
  ).length;
  const spacesCompleted = progresses.filter(
    ({ done, failures }) => done && failures < MAX_CONSECUTIVE_SPACE_FAILURES
  ).length;

  const reportCompletion = (reachedRunLimit: boolean) => {
    coreStart.analytics.reportEvent(ALERT_ENTITY_ID_BACKFILL_COMPLETED_EVENT.eventType, {
      durationInSeconds: Math.round((startedAt - new Date(firstRunAt).getTime()) / 1_000),
      runs: updatedState.runs,
      spacesCompleted,
      spacesAbandoned: abandoned,
      alertsStamped: totalStamped,
      alertsLeftUnstamped: totalLeftUnstamped,
      spacesWithUnknownAlertCount,
      reachedRunLimit,
    });
  };

  if (remaining === 0) {
    logger.info(
      abandoned === 0
        ? `Task "${TASK_TYPE}" completed for all spaces; removing the task.`
        : `Task "${TASK_TYPE}" finished with ${abandoned} space(s) abandoned after repeated failures; removing the task.`
    );
    reportCompletion(false);

    return removeTask({ esClient, logger, spaces, signal });
  }

  if (updatedState.runs >= MAX_RUNS) {
    logger.warn(
      `Task "${TASK_TYPE}" reached the ${MAX_RUNS} run limit with ${remaining} space(s) unfinished; removing the task. Their alerts keep using the risk scoring fallback.`
    );
    reportCompletion(true);
    return removeTask({ esClient, logger, spaces, signal });
  }

  return {
    state: updatedState,
    runAt: new Date(Date.now() + nextPollMs),
  };
};

const createBackfillTaskRunner =
  ({
    getStartServices,
    logger,
    enabled,
  }: Pick<EntityAnalyticsMigrationsParams, 'getStartServices' | 'logger'> & { enabled: boolean }) =>
  ({ taskInstance, signal }: RunContext) => ({
    run: async () => {
      const [coreStart, depsStart] = await getStartServices();

      return coreStart.executionContext.withContext(
        buildEaExecutionContext(EA_EXECUTION_CONTEXT_NAMES.ALERT_ENTITY_ID_BACKFILL, TASK_ID),
        async () => {
          const taskState = taskInstance.state as Partial<LatestTaskStateSchema>;

          return runBackfillTask({
            coreStart,
            logger,
            entityStore: depsStart.entityStore,
            enabled,
            state: { ...defaultState, ...taskState },
            signal,
          });
        }
      );
    },

    cancel: async () => {
      logger.debug(`Task cancelled: "${TASK_TYPE}"`);
    },
  });

/**
 * Registers and schedules the one-off backfill that stamps `kibana.alert.entity.id` onto alerts
 */
export const scheduleAlertEntityIdBackfill = async ({
  taskManager,
  logger: parentLogger,
  getStartServices,
  entityAnalyticsConfig,
}: EntityAnalyticsMigrationsParams) => {
  if (!taskManager) {
    return;
  }

  // Defaults to true: the kill switch has to be set deliberately, and an older config that predates
  // it should not silently disable the backfill.
  const enabled = entityAnalyticsConfig?.alertEntityIdBackfill.enabled ?? true;

  const logger = parentLogger.get(LOGGER_NAME);

  logger.debug(`Register task "${TASK_TYPE}"`);
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Backfill entity IDs on existing security alerts',
      description:
        'Stamps kibana.alert.entity.id onto alerts written before the field existed, so risk scoring stops re-deriving it on every run. Removes itself once every space is done.',
      timeout: TASK_TIMEOUT,
      maxAttempts: 3,
      priority: TaskPriority.Maintenance,
      stateSchemaByVersion,
      createTaskRunner: createBackfillTaskRunner({ getStartServices, logger, enabled }),
    },
  });

  const [, depsStart] = await getStartServices();
  const taskManagerStart = depsStart.taskManager;

  if (!taskManagerStart) {
    return;
  }

  if (!enabled) {
    // Registered but never scheduled, so Task Manager does not log an unsupported task type if one
    // is still on disk from before it was turned off.
    logger.info(`Task "${TASK_TYPE}" is disabled by configuration; not scheduling.`);
    return;
  }

  const now = new Date();
  try {
    await taskManagerStart.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      scheduledAt: now,
      runAt: now,
      scope: TASK_SCOPE,
      params: {},
      state: defaultState,
    });
    logger.debug(`Task scheduled: "${TASK_TYPE}"`);
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID}, received ${e.message}`);
  }
};

const logTaskCompletion = ({
  logger,
  taskRuns,
  spaces,
  progresses,
}: {
  logger: Logger;
  taskRuns: number;
  spaces: Record<string, SpaceProgress>;
  progresses: SpaceProgress[];
}) => {
  const notStarted = progresses.filter(
    ({ done, esTaskId, window }) => !done && esTaskId === undefined && window === undefined
  ).length;
  const inProgressIds = Object.entries(spaces)
    .filter(
      ([, { done, esTaskId, window }]) => !done && (esTaskId !== undefined || window !== undefined)
    )
    .map(([spaceId]) => spaceId);

  let progressSummary = '';
  if (inProgressIds.length > 0) {
    progressSummary = ` Backfill in progress for ${
      inProgressIds.length === 1
        ? `space "${inProgressIds[0]}"`
        : `spaces ${inProgressIds.map((spaceId) => `"${spaceId}"`).join(', ')}`
    }.`;
  }
  if (notStarted > 0) {
    progressSummary = `${progressSummary} Remaining spaces: ${notStarted}.`;
  }

  logger.info(`Task "${TASK_TYPE}" run ${taskRuns} finished.${progressSummary}`);
};

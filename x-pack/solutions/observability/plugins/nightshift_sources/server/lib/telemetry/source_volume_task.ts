/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceStart,
  ElasticsearchClient,
  ISavedObjectsRepository,
  Logger,
} from '@kbn/core/server';
import {
  TaskCost,
  TaskPriority,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import pLimit from 'p-limit';
import {
  NIGHTSHIFT_SOURCE_SO_TYPE,
  type NightshiftSourceAttributes,
} from '../../saved_objects/nightshift_source_saved_object';
import { measureSourceVolume } from './measure_source_volume';
import { SOURCE_VOLUME_EVENT_TYPE, type SourceVolumeEntry } from './source_volume_event';

export const SOURCE_VOLUME_TASK_TYPE = 'nightshiftSources:sourceVolumeTelemetry';
export const SOURCE_VOLUME_TASK_ID = 'nightshift-sources:source-volume-telemetry:1.0.0';
const TASK_INTERVAL = '24h';
const TASK_TIMEOUT = '10m';
const WINDOW_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_CONCURRENT_MEASUREMENTS = 5;

export interface SourceVolumeTaskDeps {
  analytics: AnalyticsServiceStart;
  esClient: ElasticsearchClient;
  soRepository: ISavedObjectsRepository;
  isServerless: boolean;
  cpsEnabled: boolean;
  logger: Logger;
}

interface EnabledSource {
  id: string;
  spaceId: string;
  attributes: Pick<NightshiftSourceAttributes, 'esql' | 'type'>;
}

// Hidden type: the repository must be created with it included; `namespaces: ['*']` spans every space.
const listEnabledSources = async (
  soRepository: ISavedObjectsRepository,
  signal: AbortSignal
): Promise<EnabledSource[]> => {
  const finder = soRepository.createPointInTimeFinder<NightshiftSourceAttributes>({
    type: NIGHTSHIFT_SOURCE_SO_TYPE,
    namespaces: ['*'],
    perPage: PAGE_SIZE,
    filter: `${NIGHTSHIFT_SOURCE_SO_TYPE}.attributes.enabled: true`,
    fields: ['esql', 'type'],
  });
  const sources: EnabledSource[] = [];
  try {
    for await (const { saved_objects: savedObjects } of finder.find()) {
      signal.throwIfAborted();
      for (const { id, attributes, namespaces } of savedObjects) {
        sources.push({ id, spaceId: namespaces?.[0] ?? 'default', attributes });
      }
    }
  } finally {
    // The finder only closes its point in time when it reaches the last page.
    await finder.close();
  }
  return sources;
};

/** One event per run with every enabled source of every space; an abort ends the run without one. */
export const reportSourceVolumes = async (
  { analytics, esClient, soRepository, isServerless, cpsEnabled, logger }: SourceVolumeTaskDeps,
  signal: AbortSignal
): Promise<void> => {
  const end = Date.now();
  const window = {
    start: new Date(end - WINDOW_MS).toISOString(),
    end: new Date(end).toISOString(),
  };

  const sources = await listEnabledSources(soRepository, signal);
  if (sources.length === 0) {
    logger.debug('No enabled source to report');
    return;
  }

  const limit = pLimit(MAX_CONCURRENT_MEASUREMENTS);
  const entries: SourceVolumeEntry[] = await Promise.all(
    sources.map(({ id, spaceId, attributes: { esql, type } }) =>
      limit(async () => {
        signal.throwIfAborted();
        return {
          space_id: spaceId,
          source_id: id,
          source_type: type,
          ...(await measureSourceVolume({
            esClient,
            esql,
            isServerless,
            cpsEnabled,
            window,
            signal,
            logger,
          })),
        };
      })
    )
  );
  // Measurements in flight when the abort fired came back as timeouts; the event would be partial.
  signal.throwIfAborted();

  analytics.reportEvent(SOURCE_VOLUME_EVENT_TYPE, {
    window_start: window.start,
    window_end: window.end,
    sources: entries,
  });
  logger.debug(`Reported the volume of ${entries.length} source(s)`);
};

export const registerSourceVolumeTask = ({
  taskManager,
  getDeps,
}: {
  taskManager: TaskManagerSetupContract;
  getDeps: () => Promise<SourceVolumeTaskDeps>;
}): void => {
  taskManager.registerTaskDefinitions({
    [SOURCE_VOLUME_TASK_TYPE]: {
      title: 'Nightshift Sources - daily volume telemetry',
      description:
        'Reports the data volume each enabled Nightshift source matched over the past 24 hours via EBT.',
      timeout: TASK_TIMEOUT,
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ taskInstance, signal }) => ({
        async run() {
          await reportSourceVolumes(await getDeps(), signal);
          return { state: taskInstance.state };
        },
      }),
    },
  });
};

export const scheduleSourceVolumeTask = (
  taskManager: TaskManagerStartContract,
  logger: Logger
): void => {
  taskManager
    .ensureScheduled({
      id: SOURCE_VOLUME_TASK_ID,
      taskType: SOURCE_VOLUME_TASK_TYPE,
      schedule: { interval: TASK_INTERVAL },
      params: {},
      state: {},
      scope: ['nightshiftSources'],
    })
    .catch((error) => {
      logger.error(`Failed to schedule the source volume telemetry task: ${error.message}`);
    });
};

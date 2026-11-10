/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import type { ObltParallelWorkerFixtures } from '@kbn/scout-oblt';
import { LOGS_ML_INDEX } from '../constants';

type ScoutSpace = Pick<ObltParallelWorkerFixtures['scoutSpace'], 'uiSettings'>;

/**
 * Points the space's `observability:logSources` setting at the empty Logs ML index, so the Logs
 * ML pages' default log view finds an existing index and renders instead of the no-data page.
 */
export const setLogsMlLogSources = async (scoutSpace: ScoutSpace): Promise<void> => {
  await scoutSpace.uiSettings.set({
    [OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID]: [LOGS_ML_INDEX],
  });
};

/** Restores the space's `observability:logSources` setting to its default. */
export const resetLogsMlLogSources = async (scoutSpace: ScoutSpace): Promise<void> => {
  await scoutSpace.uiSettings.unset(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID);
};

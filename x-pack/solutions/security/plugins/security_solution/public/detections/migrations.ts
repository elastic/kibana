/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { migrateAlertPageControlsTo816 } from '../timelines/containers/local_storage/migrate_alert_page_controls';
import type { StartPlugins } from '../types';

/* Migrator could be sync or async */
type LocalStorageMigrator = (storage: Storage, plugins: StartPlugins) => void | Promise<void>;

const getLocalStorageMigrationRunner = (storage: Storage, plugins: StartPlugins) => {
  const runLocalStorageMigration = async (fn: LocalStorageMigrator) => {
    await fn(storage, plugins);
  };
  return runLocalStorageMigration;
};

export const runDetectionMigrations = async (storage: Storage, plugins: StartPlugins) => {
  const runLocalStorageMigration = getLocalStorageMigrationRunner(storage, plugins);
  await runLocalStorageMigration(migrateAlertPageControlsTo816);
};

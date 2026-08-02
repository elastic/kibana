/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { type CoreStart, SPACES_EXTENSION_ID } from '@kbn/core/server';
import isEmpty from 'lodash/isEmpty';
import { EntityStoreGlobalStateClient } from '../global_state';
import { EntityStoreGlobalStateTypeName } from '../global_state/types';
import {
  getLegacyLogExtractionOverrides,
  type LogExtractionConfig,
} from '../../logs_extraction/config';
import { LogExtractionOverridesClient } from './client';

const MAX_PER_PAGE = 10_000;

export async function migrateLogExtractionOverridesFromGlobalState({
  globalStateClient,
  overridesClient,
  logger,
}: {
  globalStateClient: EntityStoreGlobalStateClient;
  overridesClient: LogExtractionOverridesClient;
  logger: Logger;
}): Promise<boolean> {
  const legacy = (await globalStateClient.find())?.logsExtraction;
  if (isEmpty(legacy)) return false;

  if (isEmpty(await overridesClient.get())) {
    const legacyOverrides = getLegacyLogExtractionOverrides(legacy);
    if (!isEmpty(legacyOverrides)) {
      await overridesClient.upsert(legacyOverrides);
      logger.info(
        `Migrated log extraction overrides from global state: ${Object.keys(legacyOverrides).join(
          ', '
        )}`
      );
    } else {
      logger.info('Legacy logsExtraction matched v1 defaults; nothing to persist');
    }
  }

  await globalStateClient.clearLogsExtraction();
  return true;
}

export async function migrateAllLogExtractionOverridesFromGlobalState({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}): Promise<void> {
  const migrationLogger = logger.get('logExtractionOverridesMigration');
  const discoveryClient = coreStart.savedObjects.getUnsafeInternalClient({
    excludedExtensions: [SPACES_EXTENSION_ID],
  });

  const { saved_objects: globalStateSOs } = await discoveryClient.find<{
    logsExtraction?: Partial<LogExtractionConfig>;
  }>({
    type: EntityStoreGlobalStateTypeName,
    perPage: MAX_PER_PAGE,
    namespaces: ['*'],
  });

  if (isEmpty(globalStateSOs)) {
    migrationLogger.debug('No entity-store global state SOs found; nothing to migrate');
    return;
  }

  const candidates = globalStateSOs.filter(
    (so): so is (typeof globalStateSOs)[number] & { namespaces: [string, ...string[]] } =>
      !isEmpty(so.attributes.logsExtraction) && !isEmpty(so.namespaces)
  );

  if (isEmpty(candidates)) {
    migrationLogger.debug('No spaces with legacy logsExtraction found; nothing to migrate');
    return;
  }

  const migratedNamespaces: string[] = [];

  for (const so of candidates) {
    const namespace = so.namespaces[0];
    try {
      const soClient = discoveryClient.asScopedToNamespace(namespace);
      const migrated = await migrateLogExtractionOverridesFromGlobalState({
        globalStateClient: new EntityStoreGlobalStateClient(soClient, namespace, migrationLogger),
        overridesClient: new LogExtractionOverridesClient(soClient, namespace),
        logger: migrationLogger.get(namespace),
      });
      if (migrated) migratedNamespaces.push(namespace);
    } catch (error) {
      migrationLogger.error(
        `Failed to migrate log extraction overrides for namespace ${namespace}`,
        { error }
      );
    }
  }

  if (!isEmpty(migratedNamespaces)) {
    migrationLogger.info(
      `Migrated log extraction overrides for namespaces: ${migratedNamespaces.join(', ')}`
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ISavedObjectsImporter, Logger } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import pRetry from 'p-retry';

const MAX_RETRIES = 2;

interface InstallEntityStoreDashboardsParams {
  importer: ISavedObjectsImporter;
  logger: Logger;
  spaceId: string;
}

/**
 * Installs the Entity Store APM traces dashboard into the given Kibana space.
 * Uses `overwrite: true` so the shipped version is always restored on install.
 * Wrapped in pRetry so transient SO errors don't fail the overall install.
 */
export const installEntityStoreDashboards = async ({
  importer,
  logger,
  spaceId,
}: InstallEntityStoreDashboardsParams): Promise<void> => {
  const objects = loadDashboardObjects();

  const operation = async (attemptCount: number) => {
    logger.debug(`Installing Entity Store APM dashboards (attempt ${attemptCount})...`);

    const importResult = await importer.import({
      readStream: Readable.from(objects),
      managed: true,
      overwrite: true,
      createNewCopies: false,
      refresh: false,
      namespace: SavedObjectsUtils.namespaceStringToId(spaceId),
    });

    importResult.warnings.forEach((w) => {
      logger.warn(`Entity Store dashboard install warning: ${w.message}`);
    });

    if (!importResult.success) {
      const errors = (importResult.errors ?? []).map(
        (e) => `Couldn't import "${e.type}:${e.id}": ${JSON.stringify(e.error)}`
      );
      errors.forEach((e) => logger.error(e));
      throw new Error(errors.length > 0 ? errors[0] : `Unknown error (attempt ${attemptCount})`);
    }

    logger.debug('Entity Store APM dashboards installed successfully');
  };

  await pRetry(operation, { retries: MAX_RETRIES });
};

/**
 * Reads and parses the bundled NDJSON asset, filtering out the export-summary
 * line (which lacks a `type` field and is not a saved object).
 */
const loadDashboardObjects = (): object[] => {
  const ndjson = fs.readFileSync(
    path.join(__dirname, 'entity_store_apm.ndjson'),
    'utf-8'
  );
  return ndjson
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((obj) => typeof obj.type === 'string');
};

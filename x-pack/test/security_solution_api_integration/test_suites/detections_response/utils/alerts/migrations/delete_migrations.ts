/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';

import { signalsMigrationType } from '@kbn/security-solution-plugin/server/lib/detection_engine/migrations/saved_objects';

export const deleteMigrations = async ({
  ids,
  kbnClient,
}: {
  ids: string[];
  kbnClient: KbnClient;
}): Promise<void> => {
  await Promise.all(
    ids.map((id) =>
      kbnClient.savedObjects.delete({
        id,
        type: signalsMigrationType,
      })
    )
  );
};

export const deleteMigrationsIfExists = async ({
  ids,
  kbnClient,
}: {
  ids: string[];
  kbnClient: KbnClient;
}): Promise<void> => {
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await kbnClient.savedObjects.delete({
          id,
          type: signalsMigrationType,
        });
        return res;
      } catch (e) {
        // do not throw error when migration already deleted/not found
        if (e?.response?.status !== 404) {
          throw e;
        }
      }
    })
  );
};

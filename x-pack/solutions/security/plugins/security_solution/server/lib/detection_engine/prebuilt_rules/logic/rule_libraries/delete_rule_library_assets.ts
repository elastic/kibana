/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../rule_assets/prebuilt_rule_assets_type';

const BATCH_SIZE = 1000;

const escapeKqlValue = (value: string): string => value.replace(/(["\\])/g, '\\$1');

export const toAssetVersionKey = (ruleId: string, version: number): string =>
  `${ruleId}:${version}`;

// Removes every version of every rule that was read from the library, except the versions in
// `versionsToKeep`, and returns how many were removed.
export const deleteRuleLibraryAssets = async (
  client: SavedObjectsClientContract,
  libraryId: string,
  versionsToKeep: ReadonlySet<string> = new Set()
): Promise<number> => {
  const finder = client.createPointInTimeFinder<{ rule_id: string; version: number }>({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    filter: `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.library_id: "${escapeKqlValue(libraryId)}"`,
    fields: ['rule_id', 'version'],
    perPage: BATCH_SIZE,
  });
  let deleted = 0;

  try {
    for await (const { saved_objects: assets } of finder.find()) {
      const doomed = assets.filter(
        ({ attributes }) =>
          !versionsToKeep.has(toAssetVersionKey(attributes.rule_id, attributes.version))
      );
      if (doomed.length > 0) {
        const { statuses } = await client.bulkDelete(
          doomed.map(({ id }) => ({ type: PREBUILT_RULE_ASSETS_SO_TYPE, id }))
        );
        if (statuses.some(({ success }) => !success)) {
          throw new Error(`Failed to remove rule assets of library "${libraryId}"`);
        }
        deleted += statuses.length;
      }
    }
  } finally {
    await finder.close();
  }

  return deleted;
};

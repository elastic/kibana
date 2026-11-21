/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { ELASTIC_LIBRARY_ID, RULE_LIBRARY_SO_TYPE } from '../constants';
import { RULE_LIBRARY_DEFINITIONS } from '../definitions';
import type { LibraryEnsureResult, RuleLibraryDefinition, SyncResult } from '../types';
import { ensureLibraries } from './ensure_libraries';
import { syncLibraryById } from './sync_library_by_id';

export interface SyncRuleLibrariesParams {
  client: SavedObjectsClientContract;
  packages: PackageClient;
  logger: Logger;
  definitions?: readonly RuleLibraryDefinition[];
  // Libraries to sync; every definition still gets its library object. Defaults to every library that
  // exists. The caller decides which of them the user may see.
  libraryIds?: readonly string[];
  getSecret?: (id: string) => Promise<string | undefined>;
  force?: boolean;
}

export interface SyncRuleLibrariesResult {
  results: SyncResult[];
  // Undefined when the elastic library is not in `definitions` or its sync failed.
  elastic?: LibraryEnsureResult;
}

const toEnsureResult = (result: SyncResult): LibraryEnsureResult | undefined => {
  if (result.outcome === 'failed' || !result.version) return undefined;
  return {
    status: result.outcome === 'synced' ? 'installed' : 'already_installed',
    package: { name: 'security_detection_engine', version: result.version },
  };
};

const MAX_LIBRARIES = 1000;

const findLibraryIds = async (client: SavedObjectsClientContract): Promise<string[]> => {
  const { saved_objects: libraries } = await client.find({
    type: RULE_LIBRARY_SO_TYPE,
    perPage: MAX_LIBRARIES,
    fields: [],
  });
  return libraries.map(({ id }) => id);
};

export const syncRuleLibraries = async ({
  client,
  packages,
  logger,
  definitions = RULE_LIBRARY_DEFINITIONS,
  libraryIds,
  getSecret,
  force,
}: SyncRuleLibrariesParams): Promise<SyncRuleLibrariesResult> => {
  await ensureLibraries({ client, logger, definitions });

  const selectedIds = libraryIds ?? (await findLibraryIds(client));
  const definitionIds = definitions.map(({ id }) => id);
  const ordered = [
    ...definitionIds.filter((id) => selectedIds.includes(id)),
    ...selectedIds.filter((id) => !definitionIds.includes(id)),
  ];

  const results: SyncResult[] = [];
  for (const id of ordered) {
    // Sync pin from definition each run (config may change between app loads).
    const pinned = definitions.find((definition) => definition.id === id)?.pinned_version;
    if (pinned !== undefined) {
      await client.update(RULE_LIBRARY_SO_TYPE, id, { pinned_version: pinned });
    }
    results.push(await syncLibraryById({ client, packages, logger, id, getSecret, force }));
  }

  const elastic = results.find(({ id }) => id === ELASTIC_LIBRARY_ID);
  return { results, elastic: elastic && toEnsureResult(elastic) };
};

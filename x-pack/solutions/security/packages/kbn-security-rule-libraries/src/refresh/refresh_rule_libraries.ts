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
import type { LibraryEnsureResult, RuleLibraryDefinition, RefreshResult } from '../types';
import { ensureLibraries } from './ensure_libraries';
import { refreshLibraryById } from './refresh_library_by_id';

export interface RefreshRuleLibrariesParams {
  client: SavedObjectsClientContract;
  packages: PackageClient;
  logger: Logger;
  definitions?: readonly RuleLibraryDefinition[];
  // Libraries to refresh; every definition still gets its library object. Defaults to all.
  libraryIds?: readonly string[];
  getSecret?: (id: string) => Promise<string | undefined>;
  force?: boolean;
}

export interface RefreshRuleLibrariesResult {
  results: RefreshResult[];
  // Undefined when the elastic library is not in `definitions` or its refresh failed.
  elastic?: LibraryEnsureResult;
}

const toEnsureResult = (result: RefreshResult): LibraryEnsureResult | undefined => {
  if (result.outcome === 'failed' || !result.version) return undefined;
  return {
    status: result.outcome === 'refreshed' ? 'installed' : 'already_installed',
    package: { name: 'security_detection_engine', version: result.version },
  };
};

export const refreshRuleLibraries = async ({
  client,
  packages,
  logger,
  definitions = RULE_LIBRARY_DEFINITIONS,
  libraryIds,
  getSecret,
  force,
}: RefreshRuleLibrariesParams): Promise<RefreshRuleLibrariesResult> => {
  await ensureLibraries({ client, logger, definitions });

  const results: RefreshResult[] = [];
  const selected = definitions.filter(({ id }) => !libraryIds || libraryIds.includes(id));
  for (const { id, pinned_version: pinned } of selected) {
    // Refresh pin from definition each run (config may change between app loads).
    if (pinned !== undefined) {
      await client.update(RULE_LIBRARY_SO_TYPE, id, { pinned_version: pinned });
    }
    results.push(await refreshLibraryById({ client, packages, logger, id, getSecret, force }));
  }

  const elastic = results.find(({ id }) => id === ELASTIC_LIBRARY_ID);
  return { results, elastic: elastic && toEnsureResult(elastic) };
};

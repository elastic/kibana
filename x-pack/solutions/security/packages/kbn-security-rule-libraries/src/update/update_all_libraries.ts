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
import { createProvider } from '../providers';
import type {
  LibraryEnsureResult,
  RuleLibraryAttributes,
  RuleLibraryDefinition,
  UpdateResult,
} from '../types';
import { ensureLibraries } from './ensure_libraries';
import { updateRuleLibrary } from './update_rule_library';

export interface UpdateAllParams {
  client: SavedObjectsClientContract;
  packages: PackageClient;
  logger: Logger;
  definitions?: readonly RuleLibraryDefinition[];
  getSecret?: (id: string) => Promise<string | undefined>;
  force?: boolean;
}

export interface UpdateAllResult {
  results: UpdateResult[];
  // Undefined when the elastic library is not in `definitions` or its update failed.
  elastic?: LibraryEnsureResult;
}

const toEnsureResult = (result: UpdateResult): LibraryEnsureResult | undefined => {
  if (result.outcome === 'failed' || !result.version) return undefined;
  return {
    status: result.outcome === 'updated' ? 'installed' : 'already_installed',
    package: { name: 'security_detection_engine', version: result.version },
  };
};

export const updateAllLibraries = async ({
  client,
  packages,
  logger,
  definitions = RULE_LIBRARY_DEFINITIONS,
  getSecret,
  force,
}: UpdateAllParams): Promise<UpdateAllResult> => {
  await ensureLibraries({ client, logger, definitions });

  const results: UpdateResult[] = [];
  for (const definition of definitions) {
    const { id, pinned_version: pinned } = definition;
    // Refresh pin from definition each run (config may change between app loads).
    if (pinned !== undefined) {
      await client.update(RULE_LIBRARY_SO_TYPE, id, { pinned_version: pinned });
    }
    const { attributes } = await client.get<RuleLibraryAttributes>(RULE_LIBRARY_SO_TYPE, id);
    const provider = createProvider(attributes.provider.type, { logger, packages });
    const secret = await getSecret?.(id);
    results.push(await updateRuleLibrary({ client, provider, logger, id, secret, force }));
  }

  const elastic = results.find(({ id }) => id === ELASTIC_LIBRARY_ID);
  return { results, elastic: elastic && toEnsureResult(elastic) };
};

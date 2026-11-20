/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { RULE_LIBRARY_SO_TYPE } from '../constants';
import { createProvider } from '../providers';
import type { RuleLibraryAttributes, SyncResult } from '../types';
import { syncRuleLibrary } from './sync_rule_library';

export interface SyncByIdParams {
  client: SavedObjectsClientContract;
  packages: PackageClient;
  logger: Logger;
  id: string;
  getSecret?: (id: string) => Promise<string | undefined>;
  force?: boolean;
}

export const syncLibraryById = async ({
  client,
  packages,
  logger,
  id,
  getSecret,
  force,
}: SyncByIdParams): Promise<SyncResult> => {
  const { attributes } = await client.get<RuleLibraryAttributes>(RULE_LIBRARY_SO_TYPE, id);
  const provider = createProvider(attributes.provider.type, { logger, packages });
  const secret = await getSecret?.(id);
  return syncRuleLibrary({ client, provider, logger, id, secret, force });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { RULE_LIBRARY_SO_TYPE } from '../constants';
import { RULE_LIBRARY_DEFINITIONS } from '../definitions';
import type { RuleLibraryAttributes, RuleLibraryDefinition } from '../types';

export interface EnsureParams {
  client: SavedObjectsClientContract;
  logger: Logger;
  definitions?: readonly RuleLibraryDefinition[];
}

// Existing library objects are left alone; provider changes go through ESO-aware updates.
export const ensureLibraries = async ({
  client,
  logger,
  definitions = RULE_LIBRARY_DEFINITIONS,
}: EnsureParams): Promise<void> => {
  for (const { id, ...rest } of definitions) {
    try {
      await client.get(RULE_LIBRARY_SO_TYPE, id);
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
      try {
        await client.create<RuleLibraryAttributes>(RULE_LIBRARY_SO_TYPE, rest, { id });
        logger.info(`Created rule library "${id}"`);
      } catch (createError) {
        if (!SavedObjectsErrorHelpers.isConflictError(createError)) throw createError;
      }
    }
  }
};

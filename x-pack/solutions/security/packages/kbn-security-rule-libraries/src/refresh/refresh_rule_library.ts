/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { PREBUILT_RULE_SO_TYPE, RULE_LIBRARY_SO_TYPE, REFRESH_LOCK_TIMEOUT_MS } from '../constants';
import type { RuleLibraryProvider } from '../providers/types';
import type { RuleLibraryAttributes, RuleLibraryItem, RefreshResult } from '../types';

export interface RefreshParams {
  client: SavedObjectsClientContract;
  provider: RuleLibraryProvider;
  logger: Logger;
  id: string;
  // Decrypted provider secret; the plain SO client only sees the ciphertext.
  secret?: string;
  force?: boolean;
}

const isLocked = ({
  refresh_status: status,
  refresh_started_at: startedAt,
}: RuleLibraryAttributes) =>
  status === 'refreshing' &&
  startedAt !== undefined &&
  Date.now() - new Date(startedAt).getTime() < REFRESH_LOCK_TIMEOUT_MS;

const writeBatch = async (
  client: SavedObjectsClientContract,
  libraryId: string,
  items: RuleLibraryItem[]
): Promise<void> => {
  const { saved_objects: saved } = await client.bulkCreate(
    items.map(({ rule_id: ruleId, version, attributes }) => ({
      type: PREBUILT_RULE_SO_TYPE,
      id: `${libraryId}_${ruleId}_${version}`,
      attributes: { ...attributes, library_id: libraryId, managed: true },
    })),
    { overwrite: true }
  );
  for (const object of saved) {
    if ('error' in object && object.error) {
      throw new Error(`Failed to write ${object.id}: ${object.error.message}`);
    }
  }
};

export const refreshRuleLibrary = async ({
  client,
  provider,
  logger,
  id,
  secret,
  force = false,
}: RefreshParams): Promise<RefreshResult> => {
  const library = await client.get<RuleLibraryAttributes>(RULE_LIBRARY_SO_TYPE, id);
  const { attributes } = library;
  if (isLocked(attributes)) return { id, outcome: 'skipped', version: attributes.version };

  try {
    await client.update(
      RULE_LIBRARY_SO_TYPE,
      id,
      { refresh_status: 'refreshing', refresh_started_at: new Date().toISOString() },
      { version: library.version }
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      return { id, outcome: 'skipped', version: attributes.version };
    }
    throw error;
  }

  try {
    const ref = await provider.resolveVersion(
      { ...attributes, secret },
      { pinned: attributes.pinned_version }
    );

    // A refreshed library with no items is retried; a parse miss should not stick.
    const loaded =
      !force &&
      ref.version === attributes.version &&
      attributes.refresh_status === 'refreshed' &&
      (attributes.item_count ?? 0) > 0;
    if (loaded) {
      await client.update(RULE_LIBRARY_SO_TYPE, id, { refresh_status: 'refreshed' });
      return { id, outcome: 'up_to_date', version: ref.version, item_count: attributes.item_count };
    }

    // Nothing is ever deleted: historical versions and rules removed upstream are kept.
    let count = 0;
    await provider.readLatestItems({ ...attributes, secret }, ref, async (items) => {
      await writeBatch(client, id, items);
      count += items.length;
    });

    await client.update(RULE_LIBRARY_SO_TYPE, id, {
      previous_version: attributes.version,
      version: ref.version,
      ref: typeof ref.ref === 'string' ? ref.ref : undefined,
      item_count: count,
      refresh_status: 'refreshed',
      refreshed_at: new Date().toISOString(),
      last_error: null,
    });
    logger.info(`Rule library "${id}" refreshed to ${ref.version} (${count} rules)`);
    return { id, outcome: 'refreshed', version: ref.version, item_count: count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Rule library "${id}" refresh failed: ${message}`);
    await client.update(RULE_LIBRARY_SO_TYPE, id, {
      refresh_status: 'refresh_failed',
      last_error: message,
    });
    return { id, outcome: 'failed', version: attributes.version, error: message };
  }
};

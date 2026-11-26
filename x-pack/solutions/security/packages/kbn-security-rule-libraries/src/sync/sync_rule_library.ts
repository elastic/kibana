/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { PREBUILT_RULE_SO_TYPE, RULE_LIBRARY_SO_TYPE, SYNC_LOCK_TIMEOUT_MS } from '../constants';
import type { RuleLibraryProvider } from '../providers/types';
import type {
  RuleLibraryAttributes,
  RuleLibraryItem,
  SyncResult,
  LibraryVersionRef,
} from '../types';

export interface SyncParams {
  client: SavedObjectsClientContract;
  provider: RuleLibraryProvider;
  logger: Logger;
  id: string;
  // Decrypted provider secret; the plain SO client only sees the ciphertext.
  secret?: string;
  force?: boolean;
}

const isLocked = ({ sync_status: status, sync_started_at: startedAt }: RuleLibraryAttributes) =>
  status === 'syncing' &&
  startedAt !== undefined &&
  Date.now() - new Date(startedAt).getTime() < SYNC_LOCK_TIMEOUT_MS;

type ManifestUpdate = Partial<
  Pick<RuleLibraryAttributes, 'title' | 'description' | 'license' | 'owner' | 'images'>
>;

interface ManifestRead {
  update: ManifestUpdate;
  // How many rule files the library has, which is known once its files are listed. Fleet libraries have none.
  ruleCount?: number;
}

// What the library says about itself, which replaces what was saved. Fleet libraries have no manifest.
const readManifestUpdate = async (
  provider: RuleLibraryProvider,
  library: RuleLibraryAttributes,
  ref: LibraryVersionRef,
  logger: Logger
): Promise<ManifestRead> => {
  if (library.provider.type === 'fleet') return { update: {} };

  try {
    const { manifest, manifestError, ruleCount } = await provider.inspect(library, ref);
    if (manifestError) {
      logger.warn(`Manifest of rule library "${library.name}" could not be used: ${manifestError}`);
    }
    const { title, description, license, owner, images } = manifest ?? {};
    return {
      update: Object.fromEntries(
        Object.entries({ title, description, license, owner, images }).filter(
          ([, value]) => value !== undefined
        )
      ),
      ruleCount,
    };
  } catch (error) {
    // The manifest only adds details, so a library that has no readable one still syncs.
    logger.warn(
      `Manifest of rule library "${library.name}" could not be read: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { update: {} };
  }
};

const writeBatch = async (
  client: SavedObjectsClientContract,
  libraryId: string,
  libraryTitle: string,
  libraryVersion: string,
  items: RuleLibraryItem[]
): Promise<void> => {
  const { saved_objects: saved } = await client.bulkCreate(
    items.map(({ rule_id: ruleId, version, path, attributes, superseded }) => ({
      type: PREBUILT_RULE_SO_TYPE,
      id: `${libraryId}_${ruleId}_${version}`,
      attributes: {
        ...attributes,
        library_id: libraryId,
        // Left out for a version that a newer one of the release replaces, so it is not counted or listed.
        ...(superseded ? {} : { library_version: libraryVersion }),
        library_title: libraryTitle,
        library_path: path,
        managed: true,
      },
    })),
    { overwrite: true }
  );
  for (const object of saved) {
    if ('error' in object && object.error) {
      throw new Error(`Failed to write ${object.id}: ${object.error.message}`);
    }
  }
};

export const syncRuleLibrary = async ({
  client,
  provider,
  logger,
  id,
  secret,
  force = false,
}: SyncParams): Promise<SyncResult> => {
  const library = await client.get<RuleLibraryAttributes>(RULE_LIBRARY_SO_TYPE, id);
  const { attributes } = library;
  if (isLocked(attributes)) return { id, outcome: 'skipped', version: attributes.version };

  try {
    await client.update(
      RULE_LIBRARY_SO_TYPE,
      id,
      { sync_status: 'syncing', sync_started_at: new Date().toISOString() },
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

    // A synced library with no items is retried; a parse miss should not stick.
    const loaded =
      !force &&
      ref.version === attributes.version &&
      attributes.sync_status === 'synced' &&
      (attributes.item_count ?? 0) > 0;
    if (loaded) {
      await client.update(RULE_LIBRARY_SO_TYPE, id, { sync_status: 'synced' });
      return { id, outcome: 'up_to_date', version: ref.version, item_count: attributes.item_count };
    }

    const { update: manifestUpdate, ruleCount } = await readManifestUpdate(
      provider,
      { ...attributes, secret },
      ref,
      logger
    );
    const title = manifestUpdate.title ?? attributes.title;

    // The rules are saved with the release, so counting them against the total shows how far the sync is.
    await client.update(RULE_LIBRARY_SO_TYPE, id, {
      sync_target_version: ref.version,
      ...(ruleCount !== undefined ? { sync_total: ruleCount } : {}),
    });

    // Nothing is ever deleted: historical versions and rules removed upstream are kept. Every rule of this
    // release is saved with the release, which is how the rules the library has now are told apart.
    let count = 0;
    await provider.readLatestItems({ ...attributes, secret }, ref, async (items) => {
      await writeBatch(client, id, title, ref.version, items);
      count += items.length;
    });

    await client.update(RULE_LIBRARY_SO_TYPE, id, {
      ...manifestUpdate,
      previous_version: attributes.version,
      version: ref.version,
      ref: typeof ref.ref === 'string' ? ref.ref : undefined,
      item_count: count,
      sync_status: 'synced',
      synced_at: new Date().toISOString(),
      sync_target_version: null,
      sync_total: null,
      last_error: null,
    });
    logger.info(`Rule library "${id}" synced to ${ref.version} (${count} rules)`);
    return { id, outcome: 'synced', version: ref.version, item_count: count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Rule library "${id}" sync failed: ${message}`);
    await client.update(RULE_LIBRARY_SO_TYPE, id, {
      sync_status: 'sync_failed',
      sync_target_version: null,
      sync_total: null,
      last_error: message,
    });
    return { id, outcome: 'failed', version: attributes.version, error: message };
  }
};

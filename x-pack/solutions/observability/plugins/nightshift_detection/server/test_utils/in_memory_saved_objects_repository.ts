/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

/**
 * The few repository calls the state client makes, in memory and with the version and conflict
 * rules of the real one, so the client's logic runs in unit tests without Elasticsearch.
 */
export class InMemorySavedObjectsRepository {
  private readonly objects = new Map<string, { attributes: unknown; version: string }>();
  private versionCounter = 0;

  private static key(type: string, id: string, namespace?: string) {
    return `${namespace}:${type}:${id}`;
  }

  public async get(type: string, id: string, { namespace }: { namespace?: string } = {}) {
    const stored = this.objects.get(InMemorySavedObjectsRepository.key(type, id, namespace));
    if (!stored) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    return { type, id, ...stored };
  }

  public async bulkGet(
    objects: Array<{ type: string; id: string }>,
    { namespace }: { namespace?: string } = {}
  ) {
    return {
      saved_objects: objects.map(({ type, id }) => {
        const stored = this.objects.get(InMemorySavedObjectsRepository.key(type, id, namespace));
        return stored
          ? { type, id, ...stored }
          : {
              type,
              id,
              error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload,
            };
      }),
    };
  }

  public async create(
    type: string,
    attributes: unknown,
    { id, namespace }: { id: string; namespace?: string }
  ) {
    const key = InMemorySavedObjectsRepository.key(type, id, namespace);
    if (this.objects.has(key)) {
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    }

    return this.store({ key, type, id, attributes });
  }

  public async update(
    type: string,
    id: string,
    attributes: unknown,
    { version, namespace }: { version?: string; namespace?: string }
  ) {
    const key = InMemorySavedObjectsRepository.key(type, id, namespace);
    const stored = this.objects.get(key);
    if (!stored) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    if (version !== undefined && stored.version !== version) {
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    }

    return this.store({ key, type, id, attributes });
  }

  private store({
    key,
    type,
    id,
    attributes,
  }: {
    key: string;
    type: string;
    id: string;
    attributes: unknown;
  }) {
    const version = String(this.versionCounter++);
    this.objects.set(key, { attributes, version });

    return { type, id, attributes, version };
  }

  /** The repository as the client takes it. */
  public asRepository() {
    return this as unknown as ISavedObjectsRepository;
  }
}

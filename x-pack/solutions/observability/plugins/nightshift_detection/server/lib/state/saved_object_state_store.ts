/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';
import { inject, injectable } from 'inversify';
import { StateConflictError } from '../errors/state_conflict_error';
import { StateVersionMissingError } from '../errors/state_version_missing_error';
import { DETECTION_STATE_SO_TYPE } from '../../saved_objects/detection_state_saved_object';
import type { StateDocuments, StateKind, StateVersion } from './state_kinds';
import type { StateStore, VersionedState } from './state_store';

/** The internal repository of the state type. */
export const StateRepository = createToken<ISavedObjectsRepository>(
  'nightshiftDetection.StateRepository'
);

/** `<kind>[:<key>]`; the space is the namespace of the saved object. */
function toObjectId({ kind, key }: { kind: StateKind; key?: string }) {
  return key === undefined ? kind : `${kind}:${key}`;
}

function assertVersion({ id, version }: { id: string; version?: StateVersion }): StateVersion {
  if (version === undefined) {
    throw new StateVersionMissingError(id);
  }

  return version;
}

/**
 * The state store on hidden saved objects, one per document in the space it belongs to. A
 * conditional write is a saved object `version` match, and creating a document that exists is a
 * conflict.
 */
@injectable()
export class SavedObjectStateStore implements StateStore {
  constructor(@inject(StateRepository) private readonly repository: ISavedObjectsRepository) {}

  public async get<TKind extends StateKind>({
    spaceId,
    kind,
    key,
  }: {
    spaceId: string;
    kind: TKind;
    key?: string;
  }): Promise<VersionedState<TKind> | undefined> {
    const id = toObjectId({ kind, key });

    try {
      const stored = await this.repository.get(DETECTION_STATE_SO_TYPE, id, {
        namespace: spaceId,
      });

      return {
        value: stored.attributes as unknown as StateDocuments[TKind],
        version: assertVersion({ id, version: stored.version }),
      };
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }

      throw error;
    }
  }

  public async put<TKind extends StateKind>({
    spaceId,
    kind,
    key,
    value,
    version,
  }: {
    spaceId: string;
    kind: TKind;
    key?: string;
    value: StateDocuments[TKind];
    version?: StateVersion;
  }): Promise<StateVersion> {
    const id = toObjectId({ kind, key });
    // The document is stored as it is, whatever its kind.
    const attributes: Record<string, unknown> = { ...value };

    try {
      const written = version
        ? await this.repository.update(DETECTION_STATE_SO_TYPE, id, attributes, {
            version,
            namespace: spaceId,
          })
        : await this.repository.create(DETECTION_STATE_SO_TYPE, attributes, {
            id,
            namespace: spaceId,
          });

      return assertVersion({ id, version: written.version });
    } catch (error) {
      // A document that is gone since `version` was read is a lost write too.
      if (
        SavedObjectsErrorHelpers.isConflictError(error) ||
        (version && SavedObjectsErrorHelpers.isNotFoundError(error))
      ) {
        throw new StateConflictError(id);
      }

      throw error;
    }
  }
}

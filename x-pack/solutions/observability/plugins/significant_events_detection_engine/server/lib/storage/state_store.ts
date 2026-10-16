/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { mappings } from '@kbn/es-mappings';
import type { DocVersion, StateDocs, StateKind } from '../domain';
import { isNotFoundError } from '../errors';
import type { IManagedIndexInstaller, ManagedIndexDefinition } from './managed_index';

export const STATE_INDEX: ManagedIndexDefinition = {
  name: '.significant_events-detection_engine-state',
  version: 1,
  mappings: {
    dynamic: false,
    properties: {
      kind: mappings.keyword(),
      key: mappings.keyword(),
      space_id: mappings.keyword(),
      updated_at: mappings.date(),
      doc: { type: 'object', enabled: false },
    },
  },
};

/** Ids of memory notes are fingerprints; this many are read in one round trip. */
const MGET_CHUNK = 500;

interface StoredState<TKind extends StateKind> {
  kind: TKind;
  key?: string;
  space_id: string;
  updated_at: string;
  doc: StateDocs[TKind];
}

/** A state document with the token that a conditional write must present. */
export interface VersionedState<TKind extends StateKind> {
  doc: StateDocs[TKind];
  version: DocVersion;
}

/** Engine state of one space: settings, progress, ledgers, memory notes and the run lease. */
export interface IStateStore {
  get<TKind extends StateKind>(kind: TKind, key?: string): Promise<StateDocs[TKind] | undefined>;
  getVersioned<TKind extends StateKind>(
    kind: TKind,
    key?: string
  ): Promise<VersionedState<TKind> | undefined>;
  /** Many documents of one kind; missing keys are left out. */
  getMany<TKind extends StateKind>(
    kind: TKind,
    keys: string[]
  ): Promise<Map<string, StateDocs[TKind]>>;
  /**
   * Writes a document. With `ifVersion` the write fails with a 409 when someone else wrote it
   * first; with `create` it fails when the document already exists.
   */
  put<TKind extends StateKind>(
    kind: TKind,
    doc: StateDocs[TKind],
    options?: { key?: string; ifVersion?: DocVersion; create?: boolean; refresh?: boolean }
  ): Promise<DocVersion>;
  delete(kind: StateKind, options?: { key?: string; ifVersion?: DocVersion }): Promise<void>;
  /** Deletes every state document of the space except the kinds listed. */
  clear(options?: { keep?: StateKind[] }): Promise<void>;
}

/** Creates the state store of one space. Writes run as the Kibana system user. */
export function createStateStore({
  esClient,
  installer,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  installer: IManagedIndexInstaller;
  spaceId: string;
}): IStateStore {
  const index = STATE_INDEX.name;
  const docId = (kind: StateKind, key?: string) =>
    [spaceId, kind, key].filter((part) => part !== undefined).join(':');
  const ensure = () => installer.ensure(STATE_INDEX);

  const getVersioned: IStateStore['getVersioned'] = async (kind, key) => {
    await ensure();
    try {
      const response = await esClient.get<StoredState<typeof kind>>({
        index,
        id: docId(kind, key),
      });
      if (!response._source || response._seq_no === undefined) {
        return undefined;
      }
      return {
        doc: response._source.doc,
        version: { seq_no: response._seq_no, primary_term: response._primary_term! },
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  };

  return {
    async get(kind, key) {
      return (await getVersioned(kind, key))?.doc;
    },

    getVersioned,

    async getMany(kind, keys) {
      await ensure();
      const found = new Map<string, StateDocs[typeof kind]>();
      const unique = [...new Set(keys)];
      for (let offset = 0; offset < unique.length; offset += MGET_CHUNK) {
        // Sequential chunks keep one huge run from flooding the cluster with parallel mgets.
        const chunk = unique.slice(offset, offset + MGET_CHUNK);
        const response = await esClient.mget<StoredState<typeof kind>>({
          index,
          ids: chunk.map((key) => docId(kind, key)),
        });
        response.docs.forEach((item, position) => {
          if ('found' in item && item.found && item._source) {
            found.set(chunk[position], item._source.doc);
          }
        });
      }
      return found;
    },

    async put(kind, doc, { key, ifVersion, create, refresh } = {}) {
      await ensure();
      const response = await esClient.index({
        index,
        id: docId(kind, key),
        document: {
          kind,
          key,
          space_id: spaceId,
          updated_at: new Date().toISOString(),
          doc,
        },
        ...(ifVersion
          ? { if_seq_no: ifVersion.seq_no, if_primary_term: ifVersion.primary_term }
          : {}),
        ...(create ? { op_type: 'create' as const } : {}),
        refresh: refresh ? 'wait_for' : false,
      });
      return { seq_no: response._seq_no!, primary_term: response._primary_term! };
    },

    async delete(kind, { key, ifVersion } = {}) {
      await ensure();
      try {
        await esClient.delete({
          index,
          id: docId(kind, key),
          ...(ifVersion
            ? { if_seq_no: ifVersion.seq_no, if_primary_term: ifVersion.primary_term }
            : {}),
        });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    },

    async clear({ keep = [] } = {}) {
      await ensure();
      await esClient.deleteByQuery({
        index,
        // No refresh: the Kibana system user may not refresh these indices, and readers
        // tolerate a second of deleted documents.
        conflicts: 'proceed',
        query: {
          bool: {
            filter: [{ term: { space_id: spaceId } }],
            must_not: keep.length > 0 ? [{ terms: { kind: keep } }] : [],
          },
        },
      });
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import { inject, injectable } from 'inversify';
import { DetectionEngineSystemClient } from '../engine/es_client_tokens';
import { StateIndex, STATE_INDEX_NAME } from './state_index';
import { StateConflictError } from '../errors/state_conflict_error';
import { StateVersionMissingError } from '../errors/state_version_missing_error';
import type { StateDocuments, StateVersion, StateKind } from './state_kinds';
import type { StateStore, VersionedState } from './state_store';

interface StoredState<TKind extends StateKind> {
  kind: TKind;
  key?: string;
  space_id: string;
  updated_at: string;
  doc: StateDocuments[TKind];
}

/** `<space>:<kind>[:<key>]` */
function toDocId({ spaceId, kind, key }: { spaceId: string; kind: StateKind; key?: string }) {
  return [spaceId, kind, key].filter((part) => part !== undefined).join(':');
}

function toStateVersion({
  docId,
  response,
}: {
  docId: string;
  response: { _seq_no?: number; _primary_term?: number };
}): StateVersion {
  if (response._seq_no === undefined || response._primary_term === undefined) {
    throw new StateVersionMissingError(docId);
  }

  return { seq_no: response._seq_no, primary_term: response._primary_term };
}

function isConflictError(error: unknown): boolean {
  return isResponseError(error) && error.statusCode === 409;
}

/** The state store on the engine's state index, written as the Kibana system user. */
@injectable()
export class ElasticsearchStateStore implements StateStore {
  constructor(
    @inject(DetectionEngineSystemClient) private readonly esClient: ElasticsearchClient,
    @inject(StateIndex) private readonly stateIndex: StateIndex
  ) {}

  public async get<TKind extends StateKind>({
    spaceId,
    kind,
    key,
  }: {
    spaceId: string;
    kind: TKind;
    key?: string;
  }): Promise<VersionedState<TKind> | undefined> {
    await this.stateIndex.ensureReady();
    const docId = toDocId({ spaceId, kind, key });

    try {
      const response = await this.esClient.get<StoredState<TKind>>({
        index: STATE_INDEX_NAME,
        id: docId,
      });

      if (!response._source) {
        return undefined;
      }

      return {
        value: response._source.doc,
        version: toStateVersion({ docId, response }),
      };
    } catch (error) {
      if (isNotFoundError(error)) {
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
    await this.stateIndex.ensureReady();
    const docId = toDocId({ spaceId, kind, key });
    const document: StoredState<TKind> = {
      kind,
      key,
      space_id: spaceId,
      updated_at: new Date().toISOString(),
      doc: value,
    };

    try {
      const response = await this.esClient.index({
        index: STATE_INDEX_NAME,
        id: docId,
        document,
        ...(version
          ? { if_seq_no: version.seq_no, if_primary_term: version.primary_term }
          : { op_type: 'create' as const }),
      });

      return toStateVersion({ docId, response });
    } catch (error) {
      if (isConflictError(error)) {
        throw new StateConflictError(docId);
      }

      throw error;
    }
  }

  public async delete({
    spaceId,
    kind,
    key,
    version,
  }: {
    spaceId: string;
    kind: StateKind;
    key?: string;
    version: StateVersion;
  }): Promise<void> {
    await this.stateIndex.ensureReady();
    const docId = toDocId({ spaceId, kind, key });

    try {
      await this.esClient.delete({
        index: STATE_INDEX_NAME,
        id: docId,
        if_seq_no: version.seq_no,
        if_primary_term: version.primary_term,
      });
    } catch (error) {
      // Elasticsearch answers a conditional delete of a missing document with a conflict too.
      if (isConflictError(error)) {
        throw new StateConflictError(docId);
      }

      throw error;
    }
  }
}

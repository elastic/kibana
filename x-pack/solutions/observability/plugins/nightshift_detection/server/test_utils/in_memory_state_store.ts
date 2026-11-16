/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateConflictError } from '../lib/state/state_conflict_error';
import type { StateDocuments, StateVersion, StateKind } from '../lib/state/state_kinds';
import type { StateStore, VersionedState } from '../lib/state/state_store';

/** A state store in memory with the conflict rules of the real one, for tests. */
export class InMemoryStateStore implements StateStore {
  private readonly documents = new Map<string, { value: unknown; version: StateVersion }>();
  private seqNo = 0;

  private static toId({ spaceId, kind, key }: { spaceId: string; kind: StateKind; key?: string }) {
    return [spaceId, kind, key].filter((part) => part !== undefined).join(':');
  }

  public async get<TKind extends StateKind>(params: {
    spaceId: string;
    kind: TKind;
    key?: string;
  }): Promise<VersionedState<TKind> | undefined> {
    const stored = this.documents.get(InMemoryStateStore.toId(params));

    return stored
      ? { value: stored.value as StateDocuments[TKind], version: stored.version }
      : undefined;
  }

  public async put<TKind extends StateKind>(params: {
    spaceId: string;
    kind: TKind;
    key?: string;
    value: StateDocuments[TKind];
    version?: StateVersion;
  }): Promise<StateVersion> {
    const id = InMemoryStateStore.toId(params);
    this.assertVersion({ id, version: params.version });

    const version = { seq_no: this.seqNo++, primary_term: 1 };
    this.documents.set(id, { value: params.value, version });

    return version;
  }

  public async delete(params: {
    spaceId: string;
    kind: StateKind;
    key?: string;
    version: StateVersion;
  }): Promise<void> {
    const id = InMemoryStateStore.toId(params);
    this.assertVersion({ id, version: params.version, mustExist: true });
    this.documents.delete(id);
  }

  private assertVersion({
    id,
    version,
    mustExist = false,
  }: {
    id: string;
    version?: StateVersion;
    mustExist?: boolean;
  }) {
    const stored = this.documents.get(id);
    const matches = version
      ? stored?.version.seq_no === version.seq_no
      : stored === undefined && !mustExist;

    if (!matches) {
      throw new StateConflictError(id);
    }
  }
}

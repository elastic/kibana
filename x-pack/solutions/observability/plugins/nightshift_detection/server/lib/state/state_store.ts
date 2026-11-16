/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { StateDocuments, StateVersion, StateKind } from './state_kinds';

/** A state document with the version a conditional write must present. */
export interface VersionedState<TKind extends StateKind> {
  value: StateDocuments[TKind];
  version: StateVersion;
}

/**
 * Documents the engine keeps per space: the run lease and the strategy watermarks. A document is
 * addressed by space, kind and an optional key.
 */
export interface StateStore {
  /** The document, or `undefined` when it does not exist. */
  get<TKind extends StateKind>(params: {
    spaceId: string;
    kind: TKind;
    key?: string;
  }): Promise<VersionedState<TKind> | undefined>;

  /**
   * Writes the document and returns its new version. Without `version` the document is created
   * and an existing one is a conflict; with it the write only succeeds when nobody wrote since.
   *
   * @throws StateConflictError when the write lost.
   */
  put<TKind extends StateKind>(params: {
    spaceId: string;
    kind: TKind;
    key?: string;
    value: StateDocuments[TKind];
    version?: StateVersion;
  }): Promise<StateVersion>;

  /**
   * Deletes the document when it still has `version`.
   *
   * @throws StateConflictError when someone wrote or deleted it since `version`.
   */
  delete(params: {
    spaceId: string;
    kind: StateKind;
    key?: string;
    version: StateVersion;
  }): Promise<void>;
}

/** The engine's state store. Bound to the Elasticsearch implementation; tests bind their own. */
export const StateStore = createToken<StateStore>('nightshiftDetection.StateStore');

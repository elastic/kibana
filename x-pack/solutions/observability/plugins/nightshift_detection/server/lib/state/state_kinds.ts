/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The write token of a state document: a conditional write presents the version it read. */
export interface StateVersion {
  seq_no: number;
  primary_term: number;
}

/** The lease that serialises engine runs of one space. */
export interface RunLeaseDocument {
  /** Unique per acquisition, so a holder can tell its lease from one that took its place. */
  owner: string;
  acquired_at: string;
  expires_at: string;
}

/** Where a strategy's signal generator got to. */
export interface GeneratorStateDocument {
  /** End of the last fully processed minute, in epoch milliseconds. */
  processed_until: number;
}

/** The documents kept in the state index, by kind. */
export interface StateDocuments {
  lease: RunLeaseDocument;
  generator_state: GeneratorStateDocument;
}

/** The kinds of document in the state index. */
export type StateKind = keyof StateDocuments;

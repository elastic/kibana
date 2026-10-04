/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { RepositoryResolver } from './domain/ports/repository_resolver';
import type { SourceReader } from './domain/ports/source_reader';

/** The source ports for one extraction batch, plus the cleanup points the batch drives. */
export interface SourceSession {
  readonly reader: SourceReader;
  readonly repositoryResolver: RepositoryResolver;
  /** Frees everything held for one repository once its extraction ends, success or failure. */
  finishRepository(repository: string): Promise<void>;
  /** Frees everything held for the batch. */
  close(): Promise<void>;
}

export interface BatchRepositorySource {
  readonly repository: string;
  readonly remoteUrl: string;
  readonly githubConnectorId?: string;
}

/** Creates the source ports for one batch. Throws `SourceUnavailableError` when the source cannot be used. */
export type SourceSessionFactory = (batch: {
  readonly batchId: string;
  readonly request: KibanaRequest;
  readonly repositories: readonly BatchRepositorySource[];
}) => SourceSession;

/** Signals that the configured source (for example the sandbox) is not available in this deployment. */
export class SourceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceUnavailableError';
  }
}

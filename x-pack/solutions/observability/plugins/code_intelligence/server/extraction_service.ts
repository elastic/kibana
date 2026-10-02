/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';

import type { KibanaRequest } from '@kbn/core/server';
import { isLockAcquisitionError, type LockManagerService } from '@kbn/lock-manager';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

import type {
  ExtractionBatchState,
  ExtractionBatchStatus,
  RepositoryExtractionStatus,
} from '../common/extraction_batch';
import { EXTRACTION_BATCH_LOCK_ID } from '../common/extraction_lock_id';
import type { CatalogWriter } from './domain/ports/catalog_writer';
import type { FindingsWriter } from './domain/ports/findings_writer';
import type { QueryValidator } from './domain/ports/query_validator';
import type { RepositoryResolver } from './domain/ports/repository_resolver';
import { extractRepository, type ExtractionLogger } from './extract_repository';
import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import { ExtractionCapacityExhaustedError } from './extraction_capacity_exhausted_error';
import type { SourceSession, SourceSessionFactory } from './source_session';
import { InProcessClassificationWorkflowClient } from './workflows/in_process_classification_client';

/** Most batches one instance tracks, running or finished. */
const MAX_TRACKED_BATCHES = 100;

/** One repository a batch extracts, with the remote its source session reads. */
export interface BatchRepository {
  readonly repository: string;
  readonly revision: string;
  readonly remoteUrl: string;
  readonly githubConnectorId?: string;
}

/** The 2 indexes one batch writes to, scoped to the user who started it. */
export interface ExtractionWriters {
  readonly catalogWriter: CatalogWriter;
  readonly findingsWriter: FindingsWriter;
}

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

interface MutableRepositoryStatus
  extends Omit<Mutable<RepositoryExtractionStatus>, 'counts' | 'errors' | 'warnings'> {
  counts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

interface MutableBatchStatus extends Omit<Mutable<ExtractionBatchStatus>, 'repositories'> {
  repositories: MutableRepositoryStatus[];
}

const unexpectedFailure = 'Extraction failed unexpectedly.';

const batchState = (repositories: readonly MutableRepositoryStatus[]): ExtractionBatchState => {
  const failed = repositories.filter(({ status }) => status === 'failed').length;
  if (failed === 0) return 'completed';
  return failed === repositories.length ? 'failed' : 'partial';
};

/**
 * Runs extraction batches: the repositories of one batch run sequentially over one source
 * session, and 1 batch runs at a time across all Kibana instances.
 */
export class ExtractionService {
  private readonly batches = new Map<string, MutableBatchStatus>();
  private readonly promises = new Map<string, Promise<void>>();

  constructor(
    private readonly dependencies: {
      /** Serializes batches across Kibana instances, since each repository run prunes the catalog. */
      readonly lockManager: Pick<LockManagerService, 'withLock'>;
      readonly logger: ExtractionLogger;
      readonly managedWorkflows: PluginScopedManagedWorkflowsApi;
      readonly management: WorkflowsManagementApi;
      readonly createSourceSession: SourceSessionFactory;
      readonly validator: QueryValidator;
    }
  ) {}

  /**
   * Starts one batch and returns its id once this instance holds the batch lock.
   * Throws `SourceUnavailableError` when the source cannot be opened.
   */
  public async start(
    repositories: readonly BatchRepository[],
    request: KibanaRequest,
    spaceId: string,
    writers: ExtractionWriters
  ): Promise<string> {
    for (const batch of this.batches.values()) {
      if (batch.status === 'running') throw new ExtractionAlreadyRunningError(batch.id);
    }
    this.prune();
    if (this.batches.size >= MAX_TRACKED_BATCHES) throw new ExtractionCapacityExhaustedError();
    const id = randomUUID();
    const source = this.dependencies.createSourceSession({
      batchId: id,
      request,
      repositories: repositories.map(({ repository, remoteUrl, githubConnectorId }) => ({
        repository,
        remoteUrl,
        ...(githubConnectorId === undefined ? {} : { githubConnectorId }),
      })),
    });
    const batch: MutableBatchStatus = {
      id,
      status: 'running',
      startedAt: new Date().toISOString(),
      repositories: repositories.map(({ repository, revision }) => ({
        repository,
        revision,
        status: 'pending',
        counts: {},
        errors: [],
        warnings: [],
      })),
    };
    this.batches.set(id, batch);
    let signalAcquired: () => void = () => {};
    const acquired = new Promise<void>((resolve) => {
      signalAcquired = resolve;
    });
    const locked = this.dependencies.lockManager.withLock(EXTRACTION_BATCH_LOCK_ID, async () => {
      signalAcquired();
      await this.runBatch(batch, source, request, spaceId, writers);
    });
    try {
      await Promise.race([acquired, locked]);
    } catch (error) {
      this.batches.delete(id);
      await source.close().catch(() => undefined);
      if (isLockAcquisitionError(error)) throw new ExtractionAlreadyRunningError();
      throw error;
    }
    const promise = locked
      .catch(() => {
        if (batch.status !== 'running') return;
        for (const entry of batch.repositories) {
          if (entry.status === 'pending' || entry.status === 'running') {
            entry.status = 'failed';
            entry.errors = [unexpectedFailure];
            entry.completedAt = new Date().toISOString();
          }
        }
        batch.status = batchState(batch.repositories);
        batch.completedAt = new Date().toISOString();
      })
      .finally(() => this.promises.delete(id));
    this.promises.set(id, promise);
    return id;
  }

  public get(id: string): ExtractionBatchStatus | undefined {
    const batch = this.batches.get(id);
    return batch === undefined
      ? undefined
      : {
          ...batch,
          repositories: batch.repositories.map((entry) => ({
            ...entry,
            counts: { ...entry.counts },
            errors: [...entry.errors],
            warnings: [...entry.warnings],
          })),
        };
  }

  /** Runs every repository in order; 1 failure is recorded on its entry and does not stop the batch. */
  private async runBatch(
    batch: MutableBatchStatus,
    source: SourceSession,
    request: KibanaRequest,
    spaceId: string,
    writers: ExtractionWriters
  ): Promise<void> {
    try {
      for (const entry of batch.repositories) {
        entry.status = 'running';
        entry.startedAt = new Date().toISOString();
        try {
          await this.runRepository(entry, source, request, spaceId, writers);
        } finally {
          entry.completedAt = new Date().toISOString();
          await source.finishRepository(entry.repository).catch(() => undefined);
        }
      }
    } finally {
      await source.close().catch(() => undefined);
      batch.status = batchState(batch.repositories);
      batch.completedAt = new Date().toISOString();
    }
  }

  private async runRepository(
    status: MutableRepositoryStatus,
    source: SourceSession,
    request: KibanaRequest,
    spaceId: string,
    writers: ExtractionWriters
  ): Promise<void> {
    const repositoryResolver: RepositoryResolver = {
      resolve: async (revisionRequest) => {
        const resolved = await source.repositoryResolver.resolve(revisionRequest);
        if (resolved.status === 'success') status.commitSha = resolved.value.commitSha;
        return resolved;
      },
    };
    try {
      const result = await extractRepository({
        catalogWriter: writers.catalogWriter,
        findingsWriter: writers.findingsWriter,
        extractorVersion: '0.1.0',
        logger: this.dependencies.logger,
        now: () => new Date().toISOString(),
        reader: source.reader,
        repositoryRequest: { repository: status.repository, revision: status.revision },
        repositoryResolver,
        validator: this.dependencies.validator,
        workflows: new InProcessClassificationWorkflowClient(
          this.dependencies.managedWorkflows,
          this.dependencies.management,
          request,
          spaceId
        ),
      });
      if (result.status === 'failure') {
        status.status = 'failed';
        status.errors = [result.error.message];
        return;
      }
      status.status = result.value.write.failures.length === 0 ? 'completed' : 'failed';
      status.errors = result.value.write.failures.map(({ error }) => error.message);
      status.warnings = result.value.diagnostics
        .filter(({ templateId }) => templateId === undefined)
        .map(({ message }) => message);
      for (const template of result.value.generatedTemplates) {
        status.counts[template.signalType] = (status.counts[template.signalType] ?? 0) + 1;
      }
      if (result.value.findings.writtenIds.length > 0) {
        status.counts.findings = result.value.findings.writtenIds.length;
      }
    } catch (_error: unknown) {
      status.status = 'failed';
      status.errors = [unexpectedFailure];
    }
  }

  private prune(): void {
    const finished = [...this.batches.values()]
      .filter(({ status }) => status !== 'running')
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
    while (this.batches.size >= MAX_TRACKED_BATCHES && finished.length > 0) {
      const oldest = finished.shift();
      if (oldest !== undefined) this.batches.delete(oldest.id);
    }
  }
}

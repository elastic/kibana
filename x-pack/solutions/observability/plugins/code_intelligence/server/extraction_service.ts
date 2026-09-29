/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

import type { CatalogWriter } from './domain/ports/catalog_writer';
import type { QueryValidator } from './domain/ports/query_validator';
import type { RepositoryResolver } from './domain/ports/repository_resolver';
import type { SourceReader } from './domain/ports/source_reader';
import { extractRepository } from './extract_repository';
import { InProcessClassificationWorkflowClient } from './workflows/in_process_classification_client';

export interface ExtractionStatus {
  readonly id: string;
  readonly repository: string;
  readonly revision: string;
  readonly status: 'running' | 'completed' | 'failed';
  readonly counts: Readonly<Record<string, number>>;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly startedAt: string;
  readonly completedAt?: string;
}

interface MutableExtractionStatus {
  id: string;
  repository: string;
  revision: string;
  status: ExtractionStatus['status'];
  counts: Record<string, number>;
  errors: string[];
  warnings: string[];
  startedAt: string;
  completedAt?: string;
}

export class ExtractionService {
  private readonly runs = new Map<string, MutableExtractionStatus>();
  private readonly promises = new Map<string, Promise<void>>();

  public constructor(
    private readonly dependencies: {
      readonly managedWorkflows: PluginScopedManagedWorkflowsApi;
      readonly management: WorkflowsManagementApi;
      readonly reader: SourceReader;
      readonly repositoryResolver: RepositoryResolver;
      readonly validator: QueryValidator;
    }
  ) {}

  public start(
    repository: string,
    revision: string,
    request: KibanaRequest,
    spaceId: string,
    catalogWriter: CatalogWriter
  ): string {
    this.prune();
    if (this.runs.size >= 100) {
      throw new Error('Extraction tracking capacity is full.');
    }
    const id = randomUUID();
    const run: MutableExtractionStatus = {
      id,
      repository,
      revision,
      status: 'running',
      counts: {},
      errors: [],
      warnings: [],
      startedAt: new Date().toISOString(),
    };
    this.runs.set(id, run);
    const promise = this.run(run, request, spaceId, catalogWriter).finally(() =>
      this.promises.delete(id)
    );
    this.promises.set(id, promise);
    return id;
  }

  public get(id: string): ExtractionStatus | undefined {
    const run = this.runs.get(id);
    return run === undefined
      ? undefined
      : {
          ...run,
          counts: { ...run.counts },
          errors: [...run.errors],
          warnings: [...run.warnings],
        };
  }

  private async run(
    status: MutableExtractionStatus,
    request: KibanaRequest,
    spaceId: string,
    catalogWriter: CatalogWriter
  ): Promise<void> {
    try {
      const result = await extractRepository({
        catalogWriter,
        extractorVersion: '0.1.0',
        now: () => new Date().toISOString(),
        reader: this.dependencies.reader,
        repositoryRequest: {
          repository: status.repository,
          revision: status.revision,
        },
        repositoryResolver: this.dependencies.repositoryResolver,
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
      } else {
        status.status = result.value.write.failures.length === 0 ? 'completed' : 'failed';
        status.errors = result.value.write.failures.map(({ error }) => error.message);
        status.warnings = result.value.diagnostics
          .filter(({ templateId }) => templateId === undefined)
          .map(({ message }) => message);
        for (const template of result.value.generatedTemplates) {
          status.counts[template.signalType] = (status.counts[template.signalType] ?? 0) + 1;
        }
      }
    } catch (_error: unknown) {
      status.status = 'failed';
      status.errors = ['Extraction failed unexpectedly.'];
    } finally {
      status.completedAt = new Date().toISOString();
    }
  }

  private prune(): void {
    const completed = [...this.runs.values()]
      .filter(({ status }) => status !== 'running')
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
    while (this.runs.size >= 100 && completed.length > 0) {
      const oldest = completed.shift();
      if (oldest !== undefined) this.runs.delete(oldest.id);
    }
  }
}

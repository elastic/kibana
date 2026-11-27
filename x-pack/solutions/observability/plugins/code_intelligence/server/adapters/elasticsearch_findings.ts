/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isLeft } from 'fp-ts/Either';
import * as t from 'io-ts';

import type { ElasticsearchClient } from '@kbn/core/server';

import {
  findingDocumentRt,
  OPEN_FINDING_STATUS,
  type FindingDocument,
  type FindingsWriteResult,
} from '../domain/models/finding_document_codec';
import type { OperationResult } from '../domain/models/operation_result';
import type {
  FindingsPruneRequest,
  FindingsPruneResult,
  FindingsWriter,
} from '../domain/ports/findings_writer';

/** `title` and `summary` are plain text: index-only review needs no semantic search or inference cost. */
const findingsMappings: estypes.MappingTypeMapping = {
  properties: {
    repository: { type: 'keyword' },
    revision: { type: 'keyword' },
    finding_type: { type: 'keyword' },
    signal_type: { type: 'keyword' },
    title: { type: 'text' },
    summary: { type: 'text' },
    evidence: { type: 'object', enabled: true },
    candidate_id: { type: 'keyword' },
    cataloged: { type: 'boolean' },
    catalog_document_ids: { type: 'keyword' },
    log_level: { type: 'keyword' },
    extractor_version: { type: 'keyword' },
    status: { type: 'keyword' },
    review_note: { type: 'text' },
    reviewed_at: { type: 'date' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
};

/** Fields rewritten on every extraction; `status`, the review fields, and `created_at` are deliberately absent. */
export const findingUpdateSource = (document: FindingDocument): Record<string, unknown> => ({
  repository: document.repository,
  revision: document.revision,
  finding_type: document.findingType,
  signal_type: document.signalType,
  title: document.title,
  summary: document.summary,
  evidence: document.evidence,
  candidate_id: document.candidateId,
  cataloged: document.cataloged,
  catalog_document_ids: document.catalogDocumentIds,
  ...(document.logLevel === undefined ? {} : { log_level: document.logLevel }),
  extractor_version: document.extractorVersion,
  updated_at: document.updatedAt,
});

/** Fields written only when the finding does not exist yet, so a reviewer's state survives re-runs. */
export const findingUpsertSource = (document: FindingDocument): Record<string, unknown> => ({
  ...findingUpdateSource(document),
  status: OPEN_FINDING_STATUS,
  created_at: document.createdAt,
});

export class ElasticsearchFindingsWriter implements FindingsWriter {
  private indexReady: Promise<void> | undefined;

  constructor(private readonly client: ElasticsearchClient, private readonly index: string) {}

  private ensureIndex(): Promise<void> {
    this.indexReady ??= this.createIndex();
    return this.indexReady;
  }

  private async createIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.index });
    if (!exists) {
      try {
        await this.client.indices.create({ index: this.index, mappings: findingsMappings });
      } catch (error) {
        const existsAfterRace = await this.client.indices.exists({ index: this.index });
        if (!existsAfterRace) throw error;
      }
    }
  }

  public async write(
    documents: readonly FindingDocument[]
  ): Promise<OperationResult<FindingsWriteResult>> {
    if (isLeft(t.readonlyArray(findingDocumentRt).decode(documents))) {
      return {
        error: {
          code: 'invalid_findings_write_request',
          message: 'Findings write request did not match its contract.',
          retryable: false,
        },
        status: 'failure',
      };
    }
    if (new Set(documents.map(({ id }) => id)).size !== documents.length) {
      return {
        error: {
          code: 'duplicate_finding_id',
          message: 'Findings write requests must have unique document IDs.',
          retryable: false,
        },
        status: 'failure',
      };
    }
    if (documents.length === 0) {
      return { status: 'success', value: { failures: [], writtenIds: [] } };
    }
    try {
      await this.ensureIndex();
      const failures: FindingsWriteResult['failures'][number][] = [];
      const writtenIds: string[] = [];
      for (let offset = 0; offset < documents.length; offset += 200) {
        const batch = documents.slice(offset, offset + 200);
        const operations = batch.flatMap((document) => [
          { update: { _index: this.index, _id: document.id } },
          { doc: findingUpdateSource(document), upsert: findingUpsertSource(document) },
        ]);
        const response = await this.client.bulk({ operations, refresh: false });
        response.items.forEach((item, index) => {
          const outcome = item.update;
          const document = batch[index];
          if (document === undefined) return;
          if (outcome !== undefined && outcome.status >= 200 && outcome.status < 300) {
            writtenIds.push(document.id);
          } else {
            const status = outcome?.status;
            failures.push({
              documentId: document.id,
              error: {
                code: 'findings_bulk_item_failure',
                message: 'Elasticsearch rejected a finding.',
                retryable:
                  status === 408 || status === 429 || (status !== undefined && status >= 500),
              },
            });
          }
        });
      }
      return { status: 'success', value: { failures, writtenIds } };
    } catch (_error: unknown) {
      this.indexReady = undefined;
      return {
        error: {
          code: 'findings_transport_failure',
          message: 'Elasticsearch findings write failed.',
          retryable: true,
        },
        status: 'failure',
      };
    }
  }

  public async prune({
    repository,
    keepIds,
  }: FindingsPruneRequest): Promise<OperationResult<FindingsPruneResult>> {
    if (repository.length === 0) {
      return {
        error: {
          code: 'invalid_findings_prune_request',
          message: 'Findings prune requires a repository.',
          retryable: false,
        },
        status: 'failure',
      };
    }
    try {
      await this.ensureIndex();
      // Writes use `refresh: false`; refresh first so updated findings are searched at their new version.
      await this.client.indices.refresh({ index: this.index });
      const response = await this.client.deleteByQuery({
        index: this.index,
        conflicts: 'proceed',
        refresh: true,
        query: {
          bool: {
            filter: [{ term: { repository } }],
            ...(keepIds.length === 0 ? {} : { must_not: [{ ids: { values: [...keepIds] } }] }),
          },
        },
      });
      if (
        response.timed_out === true ||
        (response.failures?.length ?? 0) > 0 ||
        (response.version_conflicts ?? 0) > 0
      ) {
        return {
          error: {
            code: 'findings_prune_incomplete',
            message: 'Elasticsearch did not delete every stale finding.',
            retryable: true,
          },
          status: 'failure',
        };
      }
      return { status: 'success', value: { deleted: response.deleted ?? 0 } };
    } catch (_error: unknown) {
      this.indexReady = undefined;
      return {
        error: {
          code: 'findings_prune_transport_failure',
          message: 'Elasticsearch findings prune failed.',
          retryable: true,
        },
        status: 'failure',
      };
    }
  }
}

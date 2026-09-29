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
  catalogWriteRequestRt,
  type CatalogDocument,
  type CatalogWriteRequest,
  type CatalogWriteResult,
} from '../domain/models/catalog_document_codec';
import type { OperationResult } from '../domain/models/operation_result';
import type { CatalogWriter } from '../domain/ports/catalog_writer';

const catalogMappings: estypes.MappingTypeMapping = {
  properties: {
    repository: { type: 'keyword' },
    revision: { type: 'keyword' },
    signal_type: { type: 'keyword' },
    templated_query: { type: 'text', index: true },
    parameters: { type: 'object', enabled: true },
    title: { type: 'semantic_text' },
    description: { type: 'semantic_text' },
    evidence: { type: 'object', enabled: true },
    extractor_version: { type: 'keyword' },
    severity_score: { type: 'byte' },
    log_level: { type: 'keyword' },
    source_hash: { type: 'keyword' },
    validation: {
      properties: {
        status: { type: 'keyword' },
        diagnostics: { type: 'text' },
      },
    },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
};

export const catalogDocumentSource = (request: CatalogWriteRequest): Record<string, unknown> => {
  const document: CatalogDocument = request.document;
  return {
    repository: document.repository,
    revision: document.revision,
    signal_type: document.signalType,
    templated_query: document.templatedQuery,
    parameters: document.parameters,
    title: document.title,
    description: document.description,
    evidence: document.evidence,
    extractor_version: document.extractorVersion,
    ...(document.severityScore === undefined ? {} : { severity_score: document.severityScore }),
    ...(document.logLevel === undefined ? {} : { log_level: document.logLevel }),
    source_hash: document.sourceHash,
    validation: request.validation,
    created_at: document.createdAt,
    updated_at: document.updatedAt,
  };
};

const failure = (code: string, message: string): OperationResult<CatalogWriteResult> => ({
  error: { code, message, retryable: true },
  status: 'failure',
});

export class ElasticsearchCatalogWriter implements CatalogWriter {
  private indexReady: Promise<void> | undefined;

  public constructor(
    private readonly client: ElasticsearchClient,
    private readonly index: string
  ) {}

  private ensureIndex(): Promise<void> {
    this.indexReady ??= this.createIndex();
    return this.indexReady;
  }

  private async createIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.index });
    if (!exists) {
      try {
        await this.client.indices.create({ index: this.index, mappings: catalogMappings });
      } catch (error) {
        const existsAfterRace = await this.client.indices.exists({ index: this.index });
        if (!existsAfterRace) throw error;
      }
    }
  }

  public async write(
    requests: readonly CatalogWriteRequest[]
  ): Promise<OperationResult<CatalogWriteResult>> {
    if (isLeft(t.readonlyArray(catalogWriteRequestRt).decode(requests))) {
      return {
        error: {
          code: 'invalid_catalog_write_request',
          message: 'Catalog write request did not match its contract.',
          retryable: false,
        },
        status: 'failure',
      };
    }
    if (new Set(requests.map(({ document }) => document.id)).size !== requests.length) {
      return {
        error: {
          code: 'duplicate_catalog_request_id',
          message: 'Catalog write requests must have unique document IDs.',
          retryable: false,
        },
        status: 'failure',
      };
    }
    if (requests.length === 0) {
      return { status: 'success', value: { failures: [], writtenIds: [] } };
    }
    try {
      await this.ensureIndex();
      const failures: CatalogWriteResult['failures'][number][] = [];
      const writtenIds: string[] = [];
      for (let offset = 0; offset < requests.length; offset += 200) {
        const batch = requests.slice(offset, offset + 200);
        const operations = batch.flatMap((request) => [
          { index: { _index: this.index, _id: request.document.id } },
          catalogDocumentSource(request),
        ]);
        const response = await this.client.bulk({ operations, refresh: false });
        response.items.forEach((item, index) => {
          const outcome = item.index;
          const request = batch[index];
          if (request === undefined) return;
          if (outcome !== undefined && outcome.status >= 200 && outcome.status < 300) {
            writtenIds.push(request.document.id);
          } else {
            const status = outcome?.status;
            failures.push({
              documentId: request.document.id,
              error: {
                code: 'catalog_bulk_item_failure',
                message: 'Elasticsearch rejected a catalog document.',
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
      return failure('catalog_transport_failure', 'Elasticsearch catalog write failed.');
    }
  }
}

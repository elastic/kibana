/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import {
  type RelationshipKind,
  type RelationshipMetadataDoc,
} from '../../../common/domain/entity_metadata/relationship_metadata';
import { ENTITY_METADATA, getEntitiesAlias } from '../../../common/domain/entity_index';
import { BadCRUDRequestError } from '../errors';
import { runWithSpan } from '../../telemetry/traces';
import { searchRelationshipMetadata } from '../../infra/elasticsearch/relationships';

const RELATIONSHIP_METADATA_SORT_FIELDS = ['@timestamp', 'event.ingested'] as const;

export interface ListRelationshipMetadataParams {
  entityId: string;
  kind?: RelationshipKind;
  target?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_order?: SortOrder;
}

export interface ListRelationshipMetadataResult {
  records: RelationshipMetadataDoc[];
  total: number;
  page: number;
  per_page: number;
}

interface RelationshipsClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

/**
 * Read-side domain client for relationship records in the entity metadata
 * datastream. Reads filter by `event.action: relationship_observed` and
 * apply relationship-specific filters (`kind`, `target` over the
 * `RELATIONSHIP_KINDS` shape). Sibling domain clients for future event
 * actions live alongside this one. Writes go through `EntityMetadataClient`.
 */
export class RelationshipsClient {
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: RelationshipsClientDependencies) {
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
    this.initWithTracing();
  }

  private initWithTracing(): void {
    const namespace = this.namespace;

    const baseListRelationshipMetadata = this.listRelationshipMetadata.bind(this);
    const tracedListRelationshipMetadata = (
      params: ListRelationshipMetadataParams
    ): Promise<ListRelationshipMetadataResult> =>
      runWithSpan({
        name: 'entityStore.relationships.list_metadata',
        namespace,
        attributes: {
          'entity_store.relationships.operation': 'list_metadata',
        },
        cb: () => baseListRelationshipMetadata(params),
      });

    Object.defineProperty(this, 'listRelationshipMetadata', {
      value: tracedListRelationshipMetadata,
      configurable: true,
      writable: true,
    });
  }

  /**
   * Reads relationship records from the metadata datastream alias.
   * Applies defaults, validates `sort_field`, and delegates query
   * construction + I/O to `searchRelationshipMetadata`.
   */
  public async listRelationshipMetadata(
    params: ListRelationshipMetadataParams
  ): Promise<ListRelationshipMetadataResult> {
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 10;
    const sortField: string = params.sort_field ?? '@timestamp';
    const sortOrder: SortOrder = params.sort_order ?? 'desc';

    if (!(RELATIONSHIP_METADATA_SORT_FIELDS as readonly string[]).includes(sortField)) {
      throw new BadCRUDRequestError(
        `Invalid sort_field "${sortField}": must be one of ${RELATIONSHIP_METADATA_SORT_FIELDS.join(
          ', '
        )}`
      );
    }

    const resp = await searchRelationshipMetadata(this.esClient, {
      index: getEntitiesAlias(ENTITY_METADATA, this.namespace),
      entityId: params.entityId,
      kind: params.kind,
      target: params.target,
      from: params.from,
      to: params.to,
      sortField,
      sortOrder,
      pageOffset: (page - 1) * perPage,
      pageSize: perPage,
    });

    const records = resp.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is RelationshipMetadataDoc => src !== undefined);
    const total =
      typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total?.value ?? 0;

    return { records, total, page, per_page: perPage };
  }
}

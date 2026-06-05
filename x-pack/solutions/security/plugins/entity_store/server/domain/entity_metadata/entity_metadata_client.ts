/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getMetadataEntitiesDataStreamName } from '../asset_manager/metadata_data_stream';
import { runWithSpan } from '../../telemetry/traces';
import type { BulkObjectResponse } from '../crud';
import { bulkCreateEntityMetadataDocs } from '../../infra/elasticsearch/entity_metadata';

interface EntityMetadataClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

/**
 * Generic write surface for the entity metadata datastream
 * (`.entities.v2.metadata.security_{namespace}`). The datastream is shared
 * across event kinds — relationships today, behaviors/anomalies/etc.
 * tomorrow — so this client owns the append primitive and stays
 * event-action agnostic. Domain-specific read clients live in their own
 * folders and call this for writes.
 */
export class EntityMetadataClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: EntityMetadataClientDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
    this.initWithTracing();
  }

  private initWithTracing(): void {
    const namespace = this.namespace;

    const baseBulkAppendMetadata = this.bulkAppendMetadata.bind(this);
    const tracedBulkAppendMetadata = <TDoc extends object>(
      docs: TDoc[]
    ): Promise<BulkObjectResponse[]> =>
      runWithSpan({
        name: 'entityStore.metadata.bulk_append',
        namespace,
        attributes: {
          'entity_store.metadata.operation': 'bulk_append',
          'entity_store.objects.count': docs.length,
        },
        cb: () => baseBulkAppendMetadata(docs),
      });

    Object.defineProperty(this, 'bulkAppendMetadata', {
      value: tracedBulkAppendMetadata,
      configurable: true,
      writable: true,
    });
  }

  /**
   * Appends one or more documents to the entity metadata datastream.
   * Does not throw on partial bulk failure — returns one `BulkObjectResponse`
   * per failed item, mirroring `CRUDClient.bulkUpdateEntity`. Transport-level
   * exceptions propagate to the caller's boundary.
   *
   * The caller owns the doc shape (must include `event.action` and any
   * domain-specific fields). The client does not validate the shape.
   */
  public async bulkAppendMetadata<TDoc extends object>(
    docs: TDoc[]
  ): Promise<BulkObjectResponse[]> {
    if (docs.length === 0) return [];

    const resp = await bulkCreateEntityMetadataDocs(this.esClient, {
      index: getMetadataEntitiesDataStreamName(this.namespace),
      docs,
    });

    if (!resp.errors) {
      this.logger.debug(`Successfully appended ${docs.length} entity metadata docs`);
      return [];
    }
    this.logger.debug(`Appended ${docs.length} entity metadata docs with errors`);
    return resp.items
      .map((item) => Object.entries(item)[0][1])
      .filter((value) => value.error !== undefined || value.status >= 400)
      .map((value) => {
        return {
          _id: value._id,
          status: value.status,
          type: value.error?.type,
          reason: value.error?.reason,
        } as BulkObjectResponse;
      });
  }
}

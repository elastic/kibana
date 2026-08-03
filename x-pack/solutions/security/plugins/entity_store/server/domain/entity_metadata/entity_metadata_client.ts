/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getMetadataEntitiesDataStreamName } from '../asset_manager/metadata_data_stream';
import { ensureMetadataDataStreamMappingsOnce } from '../asset_manager/ensure_metadata_mappings';
import { runWithSpan } from '../../telemetry/traces';
import type { BulkCreateEntityMetadataDocsResult } from '../../infra/elasticsearch/entity_metadata';
import {
  bulkCreateEntityMetadataDocs,
  getLatestEntityMetadataDoc,
} from '../../infra/elasticsearch/entity_metadata';

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
    ): Promise<BulkCreateEntityMetadataDocsResult> =>
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
   * Does not throw on partial bulk failure — the underlying helper retries
   * transient errors and reports unrecoverable per-doc drops via its `onDrop`
   * hook, aggregated by the infra layer into `dropsByType`. Resolves to
   * `{ successful, failed, dropsByType }`. This client does not log drop
   * reasons itself — callers own logging a single summary line with
   * whatever domain context they have. Transport-level exceptions propagate
   * to the caller's boundary.
   *
   * The caller owns the doc shape (must include `event.action` and any
   * domain-specific fields). The client does not validate the shape.
   */
  public async bulkAppendMetadata<TDoc extends object>(
    docs: TDoc[]
  ): Promise<BulkCreateEntityMetadataDocsResult> {
    if (docs.length === 0) return { successful: 0, failed: 0, dropsByType: [] };

    // On upgrade of an existing deployment the shared-asset install does not
    // re-run, so newly added component-template fields would never reach the
    // existing write index. Sync them in place before the first write in this
    // namespace. Best-effort and cached — never blocks the write.
    await ensureMetadataDataStreamMappingsOnce(this.esClient, this.namespace, this.logger);

    const { successful, failed, dropsByType } = await bulkCreateEntityMetadataDocs(this.esClient, {
      index: getMetadataEntitiesDataStreamName(this.namespace),
      docs,
    });

    this.logger.debug(`Appended ${successful} entity metadata docs, dropped ${failed}`);
    return { successful, failed, dropsByType };
  }

  /**
   * Returns the most recent metadata doc for `entityId` matching `eventAction`
   * ("latest wins" by `@timestamp`), or `null` if none exists. Event-action
   * agnostic: the caller owns `TDoc` and supplies the discriminating action.
   *
   * Runs against whichever ES client this instance was constructed with — pass
   * an `asCurrentUser` client to honour the caller's own index read privileges
   * (gated read), or `asInternalUser` for a system-level read.
   */
  public async getLatestByEntityId<TDoc extends object>({
    entityId,
    eventAction,
  }: {
    entityId: string;
    eventAction: string;
  }): Promise<TDoc | null> {
    return runWithSpan({
      name: 'entityStore.metadata.get_latest_by_entity_id',
      namespace: this.namespace,
      attributes: {
        'entity_store.metadata.operation': 'get_latest_by_entity_id',
        'entity_store.metadata.event_action': eventAction,
      },
      cb: () =>
        getLatestEntityMetadataDoc<TDoc>(this.esClient, {
          index: getMetadataEntitiesDataStreamName(this.namespace),
          entityId,
          eventAction,
        }),
    });
  }
}

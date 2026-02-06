/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Result } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { DocumentVersionConflictError, EntityNotFoundError } from './errors';
import type { Entity } from './schemas/entity.gen';

interface EntityManagerDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export class EntityManager {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: EntityManagerDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
  }

  private getEntityId(document: Entity): string {
    // TODO: NOT IMPLEMENTED
    throw new Error(`getEntityId() not implemented`);
    return 'TODO';
  }

  // TODO: Bulk upsert

  public async upsertEntity(document: Entity) {
    // From: x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_store_crud_client.ts
    // TODO: normalizeToECS()
    // TODO: getFlattenedObject()

    const id = this.getEntityId(document);
    this.logger.info(`Upserting entity ID ${id}`);
    const { result } = await this.esClient.update({
      index: getLatestEntitiesIndexName(this.namespace),
      id,
      doc: document,
      doc_as_upsert: true,
    });

    switch (result as Result) {
      case 'deleted':
      case 'not_found':
        throw new Error(`Could not upsert entity ID ${id}`);
      case 'created':
        this.logger.info(`Entity ID ${id} created`);
        break;
      case 'updated':
        this.logger.info(`Entity ID ${id} updated`);
        break;
      case 'noop':
        this.logger.info(`Entity ID ${id} updated (no change)`);
        break;
    }
  }

  public async upsertEntitiesBulk(documents: Entity[]) {
    await Promise.all(documents.map((document) => this.upsertEntity(document)));
  }

  public async deleteEntity(id: string) {
    const resp = await this.esClient.deleteByQuery({
      index: getLatestEntitiesIndexName(this.namespace),
      query: {
        term: {
          'entity.id': id,
        },
      },
      conflicts: 'proceed',
    });

    if (resp.failures !== undefined && resp.failures.length > 0) {
      throw new Error(`Failed to delete entity ID ${id}`);
    }
    if (resp.version_conflicts) {
      throw new DocumentVersionConflictError();
    }
    if (!resp.deleted) {
      throw new EntityNotFoundError(id);
    }
  }
}

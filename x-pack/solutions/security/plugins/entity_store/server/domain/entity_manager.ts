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
import { BadCRUDRequestError, DocumentVersionConflictError, EntityNotFoundError } from './errors';
import type { Entity } from '../../common/domain/definitions/entity.gen';
import { getFlattenedObject } from '@kbn/std';
import { getEntityDefinition } from '@kbn/entity-store/common/domain/definitions/registry';
import { EntityType } from '@kbn/entity-store/common';
import { EntityField, ManagedEntityDefinition } from '@kbn/entity-store/common/domain/definitions/entity_schema';
import { getEuidFromObject } from '@kbn/entity-store/common/domain/euid';

const PROTECTED_FIELDS = [
'entity.hashedId',
'entity.id',
'entity.EngineMetadata.UntypedId',
'entity.EngineMetadata.Type',
]


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

  private getEntityId(entityType: EntityType, document: Entity): string {
    const id = getEuidFromObject(entityType, document);
    if (id === undefined) {
      throw new Error(`Could not get EUID for document`);
    }
    return id;
  }

  public async upsertEntity(document: Entity, force: boolean) {
    const entityType = document.entity?.type;
    if (entityType == null) {
      throw new BadCRUDRequestError('', 'entity.type is required');
    }
    const id = this.getEntityId(entityType as EntityType, document);
    this.logger.info(`Upserting entity ID ${id}`);
    
    // check protected fields
    const flat = getFlattenedObject(document);
    const definition = getEntityDefinition(entityType as EntityType, this.namespace);
    const fieldDescriptions = getFieldDescriptions(id, flat, definition);
    assertNoEUIDFields(id, fieldDescriptions);
    if (!force) {
      assertOnlyNonForcedAttributesInReq(id, fieldDescriptions);
    }

    // TODO(kuba): 
    // - hash ID (MD5)
    const hashedId: string = 'TODO TODO TODO TODO';
    // - validate entity.id
    // - validate entity.hashedId

    const { result } = await this.esClient.update({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashedId,
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

  public async upsertEntitiesBulk(documents: Entity[], force: boolean) {
    await Promise.all(documents.map((document) => this.upsertEntity(document, force)));
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

function getFieldDescriptions(
  id: string,
  flatProps: Record<string, unknown>,
  description: ManagedEntityDefinition
): Record<string, EntityField & { value: unknown }> {
  const allFieldDescriptions = description.fields.reduce((obj, field) => {
    obj[field.destination || field.source] = field;
    return obj;
  }, {} as Record<string, EntityField>);

  const invalid: string[] = [];
  const descriptions: Record<string, EntityField & { value: unknown }> = {};

  for (const [key, value] of Object.entries(flatProps)) {
    if (description.identityField.requiresOneOfFields.includes(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!allFieldDescriptions[key]) {
      invalid.push(key);
    } else {
      descriptions[key] = {
        ...allFieldDescriptions[key],
        value,
      };
    }
  }

  // This will catch differences between
  // API and entity store definition
  if (invalid.length > 0) {
    const invalidString = invalid.join(', ');
    throw new BadCRUDRequestError(
      id,
      `The following attributes are not allowed to be updated: ${invalidString}`
    );
  }

  return descriptions;
}

function assertNoEUIDFields(id: string, fields: Record<string, EntityField>) {
  const notAllowedProps = [];
  for (const [name, _description] of Object.entries(fields)) {
    if (PROTECTED_FIELDS.includes(name)) {
      notAllowedProps.push(name);
    }
  }

  if (notAllowedProps.length > 0) {
    const notAllowedPropsString = notAllowedProps.join(', ');
    throw new BadCRUDRequestError(
      id, 
      `The fields are not allowed to be updated: ${notAllowedPropsString}`
    );
  }
}

function assertOnlyNonForcedAttributesInReq(id: string, fields: Record<string, EntityField>) {
  const notAllowedProps = [];

  for (const [name, description] of Object.entries(fields)) {
    if (!description.allowAPIUpdate && !PROTECTED_FIELDS.includes(name)) {
      notAllowedProps.push(name);
    }
  }

  if (notAllowedProps.length > 0) {
    const notAllowedPropsString = notAllowedProps.join(', ');
    throw new BadCRUDRequestError(
      id, 
      `The following attributes are not allowed to be ` +
        `updated without forcing it (?force=true): ${notAllowedPropsString}`
    );
  }
}
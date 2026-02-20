/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  BulkOperationContainer,
  BulkUpdateAction,
  Result,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createHash } from 'crypto';
import { unset } from 'lodash';
import { getFlattenedObject } from '@kbn/std';
import { ENTITY_ID_FIELD } from '../../common/domain/definitions/common_fields';
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { BadCRUDRequestError, EntityNotFoundError } from './errors';
import type { Entity } from '../../common/domain/definitions/entity.gen';
import { getEntityDefinition } from '../../common/domain/definitions/registry';
import type { EntityType } from '../../common';
import type {
  EntityField,
  ManagedEntityDefinition,
} from '../../common/domain/definitions/entity_schema';
import { getEuidFromObject } from '../../common/domain/euid';
import { getUpdatesEntitiesDataStreamName } from './assets/updates_data_stream';

interface CRUDClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

interface BulkObject {
  type: EntityType;
  doc: Entity;
}

function validateAndTransformDoc(
  entityType: EntityType,
  namespace: string,
  doc: Entity,
  force: boolean
): Record<string, unknown> {
    const definition = getEntityDefinition(entityType, namespace);
    if (!force) {
      const flat = getFlattenedObject(doc);
      const fieldDescriptions = getFieldDescriptions(flat, definition);
      assertOnlyNonForcedAttributesInReq(fieldDescriptions);
    }
    return transformDocForUpsert(entityType, doc);
}

export class CRUDClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: CRUDClientDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
  }

  private async createEntity(
    hashedId: string,
    doc: Record<string, unknown>
  ): Promise<void> {
    this.logger.debug(`Creating entity ID: ${hashedId}`);
    await this.esClient.create({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashedId,
      document: doc,
      refresh: 'wait_for',
    });
    this.logger.debug(`Created entity ID ${hashedId}`);
  }

  private async updateEntity(
    hashedId: string,
    entityType: EntityType,
    doc: Record<string,unknown>,
  ): Promise<void> {
    this.logger.debug(`Updating entity ID: ${hashedId}`);
    const definition = getEntityDefinition(entityType, this.namespace);
    removeEUIDFields(definition, doc);
    const { result } = await this.esClient.update({
      index: getLatestEntitiesIndexName(this.namespace),
      id: hashedId,
      doc,
      retry_on_conflict: 3,
    });

    switch (result as Result) {
      case 'deleted':
      case 'not_found':
        throw new Error(`Could not update entity ID ${hashedId}`);
      case 'updated':
        this.logger.debug(`Updated entity ID ${hashedId}`);
        break;
      case 'noop':
        this.logger.debug(`Updated entity ID ${hashedId} (no change)`);
        break;
    }
  }

  public async upsertEntity(
    entityType: EntityType,
    doc: Entity,
    force: boolean
  ): Promise<void> {
    const id = getEuidFromObject(entityType, doc);
    if (id === undefined) {
      throw new BadCRUDRequestError(`Could not derive entity EUID from document`);
    }
    // EUID generation uses MD5. It is not a security-related feature.
    // eslint-disable-next-line @kbn/eslint/no_unsafe_hash
    const hashedId: string = createHash('md5').update(id).digest('hex');
    this.logger.debug(`Upserting entity ID ${id}`);


    if (!doc.entity?.id) {
      doc.entity.id = id;
    }
    const readyDoc = validateAndTransformDoc(entityType, this.namespace, doc, force)

    try {
      await this.createEntity(hashedId, readyDoc)
    } catch (error) {
      if (error.statusCode !== 409) {
        throw error;
      }
      this.logger.debug(`Conflict while creating entity ID ${id}, updating instead`);
    }

    await this.updateEntity(hashedId, entityType, readyDoc)
    return;
  }

  public async upsertEntitiesBulk(objects: BulkObject[], force: boolean): Promise<void> {
    const operations: (BulkOperationContainer | BulkUpdateAction)[] = [];

    this.logger.debug(`Preparing ${objects.length} entities for bulk upsert`);
    for (const { type: entityType, doc } of objects) {
      const readyDoc = validateAndTransformDoc(entityType, this.namespace, doc, force)
      operations.push({ create: {} }, readyDoc);
    }

    this.logger.debug(`Bulk upserting ${objects.length} entities`);
    await this.esClient.bulk({
      index: getUpdatesEntitiesDataStreamName(this.namespace),
      operations,
      refresh: 'wait_for',
    });
    return;
  }

  public async deleteEntity(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting Entity ID ${id}`);
      await this.esClient.delete({
        index: getLatestEntitiesIndexName(this.namespace),
        id,
      });
    } catch (error) {
      if (error.statusCode === 404) {
        throw new EntityNotFoundError(id);
      }
      throw error;
    }
  }
}

function getFieldDescriptions(
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
    if (key === ENTITY_ID_FIELD || description.identityField.requiresOneOfFields.includes(key)) {
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
      `The following attributes are not allowed to be updated: [${invalidString}]`
    );
  }

  return descriptions;
}

function assertOnlyNonForcedAttributesInReq(fields: Record<string, EntityField>) {
  const notAllowedProps = [];

  for (const [name, description] of Object.entries(fields)) {
    if (!description.allowAPIUpdate) {
      notAllowedProps.push(name);
    }
  }

  if (notAllowedProps.length > 0) {
    const notAllowedPropsString = notAllowedProps.join(', ');
    throw new BadCRUDRequestError(
      `The following attributes are not allowed to be ` +
        `updated without forcing it (?force=true): ${notAllowedPropsString}`
    );
  }
}

function transformDocForUpsert(
  type: EntityType,
  data: Partial<Entity>
): Record<string, unknown> {
  const now = new Date().toISOString();
  if (type === 'generic') {
    return {
      '@timestamp': now,
      ...data,
    };
  }

  // Get host, user, service field
  const typeData = (data[type as keyof typeof data] || {}) as Record<string, unknown>;

  // Force name to be picked by the store
  typeData.name = data.entity?.id;
  // Nest entity under type data
  typeData.entity = data.entity;

  const doc: Record<string, unknown> = {
    '@timestamp': now,
    ...data,
  };

  // Remove entity from root
  delete doc.entity;

  // override the host, user service
  // field with the built value
  doc[type as keyof typeof doc] = typeData;

  return doc;
}

function removeEUIDFields(definition: ManagedEntityDefinition, doc: Record<string, unknown>) {
  for (const euidField of definition.identityField.requiresOneOfFields) {
    unset(doc, euidField);
  }
}

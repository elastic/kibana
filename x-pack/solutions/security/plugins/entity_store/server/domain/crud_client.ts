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

interface EntityManagerDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

interface BulkObject {
  type: EntityType;
  document: Entity;
}

export class CRUDClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: EntityManagerDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
  }

  public async upsertEntity(
    entityType: EntityType,
    document: Entity,
    force: boolean
  ): Promise<void> {
    const rawId = getEuidFromObject(entityType, document);
    if (rawId === undefined) {
      throw new BadCRUDRequestError(`Could not derive entity EUID from document`);
    }
    // EUID generation uses MD5. It is not a security-related feature.
    // eslint-disable-next-line @kbn/eslint/no_unsafe_hash
    const id: string = createHash('md5').update(rawId).digest('hex');
    this.logger.info(`Upserting entity ID ${id}`);
    if (!document.entity.id) {
      document.entity.id = id;
    }

    const definition = getEntityDefinition(entityType, this.namespace);
    if (!force) {
      const flat = getFlattenedObject(document);
      const fieldDescriptions = getFieldDescriptions(flat, definition);
      assertOnlyNonForcedAttributesInReq(fieldDescriptions);
    }
    const preparedDoc = prepareDocumentForUpsert(entityType, document);

    try {
      await this.esClient.create({
        index: getLatestEntitiesIndexName(this.namespace),
        id,
        document: preparedDoc,
        refresh: 'wait_for',
      });
      this.logger.info(`Created entity ID ${id}`);
      return;
    } catch (error) {
      if (error.statusCode !== 409) {
        throw error;
      }
    }

    removeEUIDFields(definition, preparedDoc);
    const { result } = await this.esClient.update({
      index: getLatestEntitiesIndexName(this.namespace),
      id,
      doc: preparedDoc,
    });

    switch (result as Result) {
      case 'deleted':
      case 'not_found':
        throw new Error(`Could not upsert entity ID ${id}`);
      case 'updated':
        this.logger.info(`Entity ID ${id} updated`);
        break;
      case 'noop':
        this.logger.info(`Entity ID ${id} updated (no change)`);
        break;
    }
  }

  public async upsertEntitiesBulk(objects: BulkObject[], force: boolean) {
    const operations: (BulkOperationContainer | BulkUpdateAction)[] = [];

    for (const { type: entityType, document } of objects) {
      const definition = getEntityDefinition(entityType, this.namespace);
      if (!force) {
        const flat = getFlattenedObject(document);
        const fieldDescriptions = getFieldDescriptions(flat, definition);
        assertOnlyNonForcedAttributesInReq(fieldDescriptions);
      }
      const preparedDoc = prepareDocumentForUpsert(entityType, document);

      operations.push({ create: {} }, preparedDoc);
    }

    await this.esClient.bulk({
      index: getUpdatesEntitiesDataStreamName(this.namespace),
      operations,
    });
  }

  public async deleteEntity(id: string) {
    try {
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
    return { deleted: true };
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

function prepareDocumentForUpsert(
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

function removeEUIDFields(definition: ManagedEntityDefinition, document: Record<string, unknown>) {
  for (const euidField of definition.identityField.requiresOneOfFields) {
    unset(document, euidField);
  }
}

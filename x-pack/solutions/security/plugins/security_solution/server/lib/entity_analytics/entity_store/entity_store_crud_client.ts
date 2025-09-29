/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import { getFlattenedObject } from '@kbn/std';
import { EntityStoreCapability } from '@kbn/entities-schema';
import type { EntityType as APIEntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { EntityType } from '../../../../common/entity_analytics/types';
import type {
  Entity,
  EntityField,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { EntityStoreDataClient } from './entity_store_data_client';
import {
  BadCRUDRequestError,
  EngineNotRunningError,
  CapabilityNotEnabledError,
  DocumentVersionConflictError,
} from './errors';
import { getEntitiesIndexName } from './utils';
import { buildUpdateEntityPainlessScript } from './painless/build_update_script';
import { getEntityUpdatesDataStreamName } from './elasticsearch_assets/updates_entity_data_stream';
import { engineDescriptionRegistry } from './installation/engine_description';
import type { EntityDescription } from './entity_definitions/types';
import type { FieldDescription } from './installation/types';

interface CustomEntityFieldsAttributesHolder {
  attributes?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  behaviors?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

type CustomECSEntityField = EntityField & CustomEntityFieldsAttributesHolder;

type CustomECSDocument = Entity & { entity: CustomECSEntityField };

interface EntityStoreClientOpts {
  logger: Logger;
  namespace: string;
  clusterClient: IScopedClusterClient;
  dataClient: EntityStoreDataClient;
}

const ENTITY_ID_FIELD = 'entity.id';

export class EntityStoreCrudClient {
  private esClient: ElasticsearchClient;
  private namespace: string;
  private logger: Logger;
  private dataClient: EntityStoreDataClient;

  constructor({ clusterClient, namespace, logger, dataClient }: EntityStoreClientOpts) {
    this.esClient = clusterClient.asCurrentUser;
    this.namespace = namespace;
    this.logger = logger;
    this.dataClient = dataClient;
  }

  public async upsertEntity(type: APIEntityType, doc: Entity, force = false) {
    await this.assertEngineIsRunning(type);
    await this.assertCRUDApiIsEnabled(type);

    const normalizedDocToECS = normalizeToECS(doc);
    const flatProps = getFlattenedObject(normalizedDocToECS);

    const entityTypeDescription = engineDescriptionRegistry[type];
    const fieldDescriptions = getFieldDescriptions(flatProps, entityTypeDescription);
    if (!force) {
      assertOnlyNonForcedAttributesInReq(fieldDescriptions);
    }

    this.logger.info(`Updating entity '${doc.entity.id}' (type ${type})`);

    const painlessUpdate = buildUpdateEntityPainlessScript(fieldDescriptions);

    if (!painlessUpdate) {
      throw new BadCRUDRequestError(`The request doesn't contain any update`);
    }

    const updateByQueryResp = await this.esClient.updateByQuery({
      index: getEntitiesIndexName(type, this.namespace),
      query: {
        term: {
          'entity.id': doc.entity.id,
        },
      },
      script: {
        source: painlessUpdate,
        lang: 'painless',
      },
      conflicts: 'proceed',
    });

    if (updateByQueryResp.version_conflicts) {
      throw new DocumentVersionConflictError();
    }

    await this.esClient.create({
      id: uuidv4(),
      index: getEntityUpdatesDataStreamName(type, this.namespace),
      document: buildDocumentToUpdate(type, normalizedDocToECS),
    });
  }

  private async assertEngineIsRunning(type: APIEntityType) {
    const engineRunning = await this.dataClient.isEngineRunning(EntityType[type]);

    if (!engineRunning) {
      throw new EngineNotRunningError(type);
    }
  }

  private async assertCRUDApiIsEnabled(type: APIEntityType) {
    const enabled = await this.dataClient.isCapabilityEnabled(
      EntityType[type],
      EntityStoreCapability.CRUD_API
    );

    if (!enabled) {
      throw new CapabilityNotEnabledError(EntityStoreCapability.CRUD_API);
    }
  }
}

function assertOnlyNonForcedAttributesInReq(fields: Record<string, FieldDescription>) {
  const notAllowedProps = [];

  for (const [name, description] of Object.entries(fields)) {
    if (!description.allowAPIUpdate && name !== ENTITY_ID_FIELD) {
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

function normalizeToECS(doc: Entity): CustomECSDocument {
  const normalizedDoc = { ...doc }; // create copy

  const { attributes, lifecycle, behaviors, relationships } = doc.entity;
  const objsToCheck = { attributes, lifecycle, behaviors, relationships };
  for (const key of Object.keys(objsToCheck)) {
    const typedKey = key as keyof typeof objsToCheck;
    const value = objsToCheck[typedKey];
    if (value) {
      normalizedDoc.entity[typedKey] = convertFieldsToCustomECS(value);
    }
  }

  return normalizedDoc;
}

function convertFieldsToCustomECS(
  obj?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!obj) {
    return undefined;
  }

  const customECSFormatObj: Record<string, unknown> = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    customECSFormatObj[convertToECSCustomFormat(key)] = obj[key];
  }

  return customECSFormatObj;
}

function convertToECSCustomFormat(key: string): string {
  // assuming we are getting a key in snake case;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function buildDocumentToUpdate(type: APIEntityType, data: Partial<CustomECSDocument>) {
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
function getFieldDescriptions(
  flatProps: Record<string, unknown>,
  description: EntityDescription
): Record<string, FieldDescription & { value: unknown }> {
  const allFieldDescriptions = description.fields.reduce((obj, field) => {
    obj[field.destination || field.source] = field;
    return obj;
  }, {} as Record<string, FieldDescription>);

  const invalid: string[] = [];
  const descriptions: Record<string, FieldDescription & { value: unknown }> = {};

  for (const [key, value] of Object.entries(flatProps)) {
    if (key === ENTITY_ID_FIELD || key === description.identityField) {
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
      `The following attributes are not allowed to be updated: ${invalidString}`
    );
  }

  return descriptions;
}

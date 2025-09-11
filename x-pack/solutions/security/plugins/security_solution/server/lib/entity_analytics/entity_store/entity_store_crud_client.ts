/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import { getFlattenedObject } from '@kbn/std';
import type { EntityType as APIEntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { EntityType } from '../../../../common/entity_analytics/types';
import type {
  Entity,
  EntityField,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { EntityStoreDataClient } from './entity_store_data_client';
import { BadCRUDRequestError, DocumentNotFoundError, EngineNotRunningError } from './errors';
import { getEntitiesIndexName } from './utils';
import { buildUpdateEntityPainlessScript } from './painless/build_update_script';
import { getEntityUpdatesIndexName } from './elasticsearch_assets/updates_entity_index';

interface CustomEntityFieldsAttributesHolder {
  attributes?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
}

type CustomECSEntityField = EntityField & CustomEntityFieldsAttributesHolder;

type CustomECSDocument = Entity & { entity: CustomECSEntityField };

interface EntityStoreClientOpts {
  logger: Logger;
  namespace: string;
  clusterClient: IScopedClusterClient;
  dataClient: EntityStoreDataClient;
}

const nonForcedAttributesPathRegex = [
  /entity\.id/,
  /entity\.attributes\..*/,
  /entity\.lifecycle\..*/,
  /entity\.behavior\..*/,
];

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

    const normalizedDocToECS = normalizeToECS(doc);
    const flatProps = getFlattenedObject(normalizedDocToECS);

    if (!force) {
      assertOnlyNonForcedAttributesInReq(flatProps);
    }

    this.logger.info(`Updating entity '${doc.entity.id}' (type ${type})`);

    const painlessUpdate = buildUpdateEntityPainlessScript(flatProps);

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
    });

    if ((updateByQueryResp.updated || 0) < 1) {
      throw new DocumentNotFoundError();
    }

    await this.esClient.create({
      id: uuidv4(),
      index: getEntityUpdatesIndexName(type, this.namespace),
      document: buildDocumentToUpdate(type, normalizedDocToECS),
    });
  }

  private async assertEngineIsRunning(type: APIEntityType) {
    const engineRunning = await this.dataClient.isEngineRunning(EntityType[type]);

    if (!engineRunning) {
      throw new EngineNotRunningError(type);
    }
  }
}

function assertOnlyNonForcedAttributesInReq(flatProps: Record<string, unknown>) {
  const notAllowedProps = [];
  const keys = Object.keys(flatProps);
  for (const key of keys) {
    if (!isPropAllowed(key)) {
      notAllowedProps.push(key);
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

function isPropAllowed(prop: string) {
  for (const regex of nonForcedAttributesPathRegex) {
    if (regex.test(prop)) {
      return true;
    }
  }

  return false;
}

function normalizeToECS(doc: Entity): CustomECSDocument {
  const normalizedDoc = { ...doc }; // create copy

  const { attributes, lifecycle, behavior } = doc.entity;
  const objsToCheck = { attributes, lifecycle, behavior };
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
  if (type === 'generic') {
    return {
      '@timestamp': new Date().toISOString(),
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
    '@timestamp': new Date().toISOString(),
    ...data,
  };

  // Remove entity from root
  delete doc.entity;

  // override the host, user service
  // field with the built value
  doc[type as keyof typeof doc] = typeData;

  return doc;
}

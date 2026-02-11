/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import { getFlattenedObject } from '@kbn/std';
import { EntityStoreCapability, identityFieldsSchema } from '@kbn/entities-schema';
import type {
  BulkOperationContainer,
  BulkUpdateAction,
} from '@elastic/elasticsearch/lib/api/types';
import { generatePivotGroup } from '@kbn/entityManager-plugin/server/lib/entities/transform/generate_latest_transform';
import get from 'lodash/get';
import type { EntityContainer } from '../../../../common/api/entity_analytics/entity_store/entities/upsert_entities_bulk.gen';
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
  EntityNotFoundError,
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

interface DeleteRequestBody {
  id: string;
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

  public async upsertEntitiesBulk(entities: EntityContainer[], force = false) {
    const docs: Record<EntityType, (BulkOperationContainer | BulkUpdateAction)[]> = {
      [EntityType.user]: [],
      [EntityType.host]: [],
      [EntityType.service]: [],
      [EntityType.generic]: [],
    };

    for (const { type, record } of entities) {
      if (docs[type].length === 0) {
        // if no operations in type yet, verify if it's all enabled
        await this.assertEngineIsRunning(type);
        await this.assertCRUDApiIsEnabled(type);
      }

      const normalizedDocToECS = normalizeToECS(record);
      const flatProps = getFlattenedObject(normalizedDocToECS);
      const entityTypeDescription = engineDescriptionRegistry[type];
      const fieldDescriptions = getFieldDescriptions(flatProps, entityTypeDescription);

      if (!force) {
        assertOnlyNonForcedAttributesInReq(fieldDescriptions);
      }

      docs[type].push({ create: {} }, buildDocumentToUpdate(type, normalizedDocToECS));
    }

    const reqs = Object.entries(docs)
      .filter(([_, ops]) => ops.length > 0)
      .map(([type, ops]) => {
        this.logger.info(`Bulk updating entities (amount: ${ops.length / 2}, type: ${type})`);
        return this.esClient.bulk({
          index: getEntityUpdatesDataStreamName(type as EntityType, this.namespace),
          operations: ops,
        });
      });

    await Promise.all(reqs);
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
      refresh: 'wait_for',
    });

    if (updateByQueryResp.updated === 0) {
      await this.createLatestIndexEntity(type, normalizedDocToECS);
    }
  }

  public async deleteEntity(type: APIEntityType, body: DeleteRequestBody) {
    await this.assertEngineIsRunning(type);
    await this.assertCRUDApiIsEnabled(type);

    if (body.id === '') {
      throw new BadCRUDRequestError(`The entity ID cannot be blank`);
    }

    const deleteByQueryResp = await this.esClient.deleteByQuery({
      index: getEntitiesIndexName(type, this.namespace),
      query: {
        term: {
          'entity.id': body.id,
        },
      },
      conflicts: 'proceed',
    });

    if (deleteByQueryResp.failures !== undefined && deleteByQueryResp.failures.length > 0) {
      throw new Error(`Failed to delete entity of type '${type}' and ID '${body.id}'`);
    }

    if (deleteByQueryResp.version_conflicts) {
      throw new DocumentVersionConflictError();
    }

    if (!deleteByQueryResp.deleted) {
      throw new EntityNotFoundError(type, body.id);
    }

    return { deleted: true };
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

  private async createLatestIndexEntity(
    type: APIEntityType,
    normalizedDocToECS: CustomECSDocument
  ) {
    const { identityField } = engineDescriptionRegistry[type];
    const previewTransform = await this.esClient.transform.previewTransform<{
      _source: { entity: { identity: Record<EntityType, string> } };
      _id: string;
    }>(
      getEntityPreviewTransformConfig(
        type as EntityType,
        this.namespace,
        identityField,
        normalizedDocToECS.entity.id
      ),
      { querystring: { as_index_request: true } }
    );

    const previewDoc = previewTransform.preview.find(
      (v) => get(v._source.entity.identity, identityField) === normalizedDocToECS.entity.id
    );
    if (!previewDoc) {
      throw new EntityNotFoundError(type, normalizedDocToECS.entity.id);
    }

    await this.esClient.create({
      id: previewDoc._id,
      index: getEntitiesIndexName(type, this.namespace),
      document: buildDocumentToUpdate(type, normalizedDocToECS),
      refresh: 'true',
    });

    this.logger.info(`Creating entity '${normalizedDocToECS.entity.id}' (type ${type})`);
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

// Generates the minimal preview transform config required to extract an entity's '_id' using 'as_index_request'
const getEntityPreviewTransformConfig = (
  type: EntityType,
  namespace: string,
  identityField: string,
  id: string
) => ({
  source: {
    index: getEntityUpdatesDataStreamName(type, namespace),
    query: { bool: { must: { term: { [identityField]: id } } } },
  },
  pivot: {
    group_by: generatePivotGroup([identityFieldsSchema.parse(identityField)]), // used for '_id' generation
    aggs: {
      count: { value_count: { field: identityField } }, // placeholder only. 'aggs' cannot be empty
    },
  },
});

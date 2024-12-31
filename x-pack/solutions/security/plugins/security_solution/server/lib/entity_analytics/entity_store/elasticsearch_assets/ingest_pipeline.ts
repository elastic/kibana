/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import { EngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';
import { type FieldRetentionDefinition } from '../field_retention_definition';
import {
  debugDeepCopyContextStep,
  getDotExpanderSteps,
  getRemoveEmptyFieldSteps,
  removeEntityDefinitionFieldsStep,
  retentionDefinitionToIngestProcessorSteps,
} from './ingest_processor_steps';
import { getIdentityFieldForEntityType } from '../utils';
import { getFieldRetentionEnrichPolicyName } from './enrich_policy';
import type { UnitedEntityDefinition } from '../united_entity_definitions';

const getPlatformPipelineId = (definition: EntityDefinition) => {
  return `${definition.id}-latest@platform`;
};

// the field that the enrich processor writes to
export const ENRICH_FIELD = 'historical';

/**
 * Builds the ingest pipeline for the field retention policy.
 * Broadly the pipeline enriches the entity with the field retention enrich policy,
 * then applies the field retention policy to the entity fields, and finally removes
 * the enrich field and any empty fields.
 *
 * While developing, be sure to set debugMode to true this will keep the enrich field
 * and the context field in the document to help with debugging.
 */
const buildIngestPipeline = ({
  version,
  fieldRetentionDefinition,
  allEntityFields,
  debugMode,
  namespace,
}: {
  fieldRetentionDefinition: FieldRetentionDefinition;
  allEntityFields: string[];
  debugMode?: boolean;
  namespace: string;
  version: string;
}): IngestProcessorContainer[] => {
  const { entityType, matchField } = fieldRetentionDefinition;
  const enrichPolicyName = getFieldRetentionEnrichPolicyName({
    namespace,
    entityType,
    version,
  });
  return [
    ...(debugMode ? [debugDeepCopyContextStep()] : []),
    {
      enrich: {
        policy_name: enrichPolicyName,
        field: matchField,
        target_field: ENRICH_FIELD,
      },
    },
    {
      set: {
        field: '@timestamp',
        value: '{{entity.last_seen_timestamp}}',
      },
    },
    {
      set: {
        field: 'entity.name',
        value: `{{${getIdentityFieldForEntityType(entityType)}}}`,
      },
    },
    ...getDotExpanderSteps(allEntityFields),
    ...retentionDefinitionToIngestProcessorSteps(fieldRetentionDefinition, {
      enrichField: ENRICH_FIELD,
    }),
    ...getRemoveEmptyFieldSteps([...allEntityFields, 'asset', `${entityType}.risk`]),
    removeEntityDefinitionFieldsStep(),
    ...(!debugMode
      ? [
          {
            remove: {
              ignore_failure: true,
              field: ENRICH_FIELD,
            },
          },
        ]
      : []),
  ];
};

// developing the pipeline is a bit tricky, so we have a debug mode
// set  xpack.securitySolution.entityAnalytics.entityStore.developer.pipelineDebugMode
// to true to keep the enrich field and the context field in the document to help with debugging.
export const createPlatformPipeline = async ({
  unitedDefinition,
  logger,
  esClient,
  debugMode,
}: {
  unitedDefinition: UnitedEntityDefinition;
  logger: Logger;
  esClient: ElasticsearchClient;
  debugMode?: boolean;
}) => {
  const { fieldRetentionDefinition, entityManagerDefinition } = unitedDefinition;
  const allEntityFields: string[] = (entityManagerDefinition?.metadata || []).map((m) => {
    if (typeof m === 'string') {
      return m;
    }

    return m.destination;
  });

  const pipeline = {
    id: getPlatformPipelineId(entityManagerDefinition),
    body: {
      _meta: {
        managed_by: 'entity_store',
        managed: true,
      },
      description: `Ingest pipeline for entity definition ${entityManagerDefinition.id}`,
      processors: buildIngestPipeline({
        namespace: unitedDefinition.namespace,
        version: unitedDefinition.version,
        fieldRetentionDefinition,
        allEntityFields,
        debugMode,
      }),
    },
  };

  logger.debug(`Attempting to create pipeline: ${JSON.stringify(pipeline)}`);

  await esClient.ingest.putPipeline(pipeline);
};

export const deletePlatformPipeline = ({
  unitedDefinition,
  logger,
  esClient,
}: {
  unitedDefinition: UnitedEntityDefinition;
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const pipelineId = getPlatformPipelineId(unitedDefinition.entityManagerDefinition);
  logger.debug(`Attempting to delete pipeline: ${pipelineId}`);
  return esClient.ingest.deletePipeline(
    {
      id: pipelineId,
    },
    {
      ignore: [404],
    }
  );
};

export const getPlatformPipelineStatus = async ({
  definition,
  esClient,
}: {
  definition: EntityDefinition;
  esClient: ElasticsearchClient;
}) => {
  const pipelineId = getPlatformPipelineId(definition);
  const pipeline = await esClient.ingest.getPipeline(
    {
      id: pipelineId,
    },
    {
      ignore: [404],
    }
  );

  return {
    id: pipelineId,
    installed: !!pipeline[pipelineId],
    resource: EngineComponentResourceEnum.ingest_pipeline,
  };
};

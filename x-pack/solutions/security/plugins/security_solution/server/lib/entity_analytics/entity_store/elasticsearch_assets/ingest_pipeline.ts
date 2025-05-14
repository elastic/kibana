/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { EngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';

import {
  debugDeepCopyContextStep,
  getDotExpanderSteps,
  getRemoveEmptyFieldSteps,
  removeEntityDefinitionFieldsStep,
} from './ingest_processor_steps';

import { getFieldRetentionEnrichPolicyName } from './enrich_policy';

import { fieldOperatorToIngestProcessor } from '../field_retention';
import type { EntityEngineInstallationDescriptor } from '../installation/types';
import { dynamicNewestRetentionSteps } from '../field_retention/dynamic_retention';

const getPlatformPipelineId = (descriptionId: string) => {
  return `${descriptionId}-latest@platform`;
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
  allEntityFields,
  debugMode,
  namespace,
  description,
}: {
  allEntityFields: string[];
  debugMode?: boolean;
  namespace: string;
  version: string;
  description: EntityEngineInstallationDescriptor;
}): IngestProcessorContainer[] => {
  const enrichPolicyName = getFieldRetentionEnrichPolicyName({
    namespace,
    entityType: description.entityType,
    version: description.version,
  });

  const processors = [
    {
      set: {
        field: '@timestamp',
        value: '{{entity.last_seen_timestamp}}',
      },
    },
    {
      set: {
        field: 'entity.name',
        override: false,
        value: `{{${description.identityField}}}`,
      },
    },
    ...(debugMode
      ? [
          {
            set: {
              field: 'debug.collected',
              value: '{{collected.metadata}}',
            },
          },
          {
            set: {
              field: 'debug._source',
              value: '{{_source}}',
            },
          },
        ]
      : []),
    {
      enrich: {
        policy_name: enrichPolicyName,
        field: description.identityField,
        target_field: ENRICH_FIELD,
      },
    },
    ...getDotExpanderSteps(allEntityFields),
    ...description.fields.map((field) =>
      fieldOperatorToIngestProcessor(field, { enrichField: ENRICH_FIELD })
    ),
    ...getRemoveEmptyFieldSteps([...allEntityFields, 'asset', `${description.entityType}.risk`]),
    removeEntityDefinitionFieldsStep(),
    ...(description.dynamic
      ? [dynamicNewestRetentionSteps(description.fields.map((field) => field.destination))]
      : []),
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

  return typeof description.pipeline === 'function'
    ? description.pipeline(processors)
    : [...(debugMode ? [debugDeepCopyContextStep()] : []), ...processors];
};

// developing the pipeline is a bit tricky, so we have a debug mode
// set  xpack.securitySolution.entityAnalytics.entityStore.developer.pipelineDebugMode
// to true to keep the enrich field and the context field in the document to help with debugging.
export const createPlatformPipeline = async ({
  logger,
  esClient,
  debugMode,
  description,
  options,
}: {
  description: EntityEngineInstallationDescriptor;
  options: { namespace: string };
  logger: Logger;
  esClient: ElasticsearchClient;
  debugMode?: boolean;
}) => {
  const allEntityFields = description.fields.map(({ destination }) => destination);

  const pipeline = {
    id: getPlatformPipelineId(description.id),
    _meta: {
      managed_by: 'entity_store',
      managed: true,
    },
    description: `Ingest pipeline for entity definition ${description.id}`,
    processors: buildIngestPipeline({
      namespace: options.namespace,
      description,
      version: description.version,
      allEntityFields,
      debugMode,
    }),
  };

  logger.debug(`Attempting to create pipeline: ${JSON.stringify(pipeline)}`);

  await esClient.ingest.putPipeline(pipeline);
};

export const deletePlatformPipeline = ({
  description,
  logger,
  esClient,
}: {
  description: EntityEngineInstallationDescriptor;
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const pipelineId = getPlatformPipelineId(description.id);
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
  engineId,
  esClient,
}: {
  engineId: string;
  esClient: ElasticsearchClient;
}) => {
  const pipelineId = getPlatformPipelineId(engineId);
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

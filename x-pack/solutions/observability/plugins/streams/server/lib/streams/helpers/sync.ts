/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  StreamDefinition,
  UnwiredStreamDefinition,
  WiredStreamDefinition,
} from '@kbn/streams-schema';
import { isResponseError } from '@kbn/es-errors';
import {
  IndicesDataStream,
  IndicesIndexTemplate,
  IngestPipeline,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { set } from '@kbn/safer-lodash-set';
import { generateLayer } from '../component_templates/generate_layer';
import { upsertComponent } from '../component_templates/manage_component_templates';
import { upsertIngestPipeline } from '../ingest_pipelines/manage_ingest_pipelines';
import {
  generateClassicIngestPipelineBody,
  generateIngestPipeline,
} from '../ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from '../ingest_pipelines/generate_reroute_pipeline';
import { upsertTemplate } from '../index_templates/manage_index_templates';
import { generateIndexTemplate } from '../index_templates/generate_index_template';
import {
  rolloverDataStreamIfNecessary,
  upsertDataStream,
} from '../data_streams/manage_data_streams';
import { getUnmanagedElasticsearchAssets } from '../stream_crud';
import { getProcessingPipelineName } from '../ingest_pipelines/name';

interface SyncStreamParamsBase {
  scopedClusterClient: IScopedClusterClient;
  logger: Logger;
}

export async function syncWiredStreamDefinitionObjects({
  definition,
  scopedClusterClient,
  logger,
  isServerless,
}: SyncStreamParamsBase & {
  definition: WiredStreamDefinition;
  isServerless: boolean;
}) {
  const componentTemplate = generateLayer(definition.name, definition, isServerless);
  await upsertComponent({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    component: componentTemplate,
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    pipeline: generateIngestPipeline(definition.name, definition),
  });

  const reroutePipeline = generateReroutePipeline({
    definition,
  });

  await upsertIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    pipeline: reroutePipeline,
  });

  await upsertTemplate({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    template: generateIndexTemplate(definition.name, isServerless),
  });

  await upsertDataStream({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    name: definition.name,
  });

  await rolloverDataStreamIfNecessary({
    esClient: scopedClusterClient.asCurrentUser,
    name: definition.name,
    logger,
    mappings: componentTemplate.template.mappings?.properties,
  });
}

interface ExecutionPlanStep {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}

async function findStreamManagedPipelineReference(
  scopedClusterClient: IScopedClusterClient,
  pipelineName: string,
  streamId: string
): Promise<{
  targetPipelineName: string;
  targetPipeline: IngestPipeline;
  referencesStreamManagedPipeline: boolean;
}> {
  const streamManagedPipelineName = getProcessingPipelineName(streamId);
  const pipeline = (await tryGettingPipeline({ scopedClusterClient, id: pipelineName })) || {
    processors: [],
  };
  const streamProcessor = pipeline.processors?.find(
    (processor) => processor.pipeline && processor.pipeline.name === streamManagedPipelineName
  );
  const customProcessor = pipeline.processors?.findLast(
    (processor) => processor.pipeline && processor.pipeline.name.endsWith('@custom')
  );
  if (streamProcessor) {
    return {
      targetPipelineName: pipelineName,
      targetPipeline: pipeline,
      referencesStreamManagedPipeline: true,
    };
  }
  if (customProcessor) {
    // go one level deeper, find the latest @custom leaf pipeline
    return await findStreamManagedPipelineReference(
      scopedClusterClient,
      customProcessor.pipeline!.name,
      streamId
    );
  }
  return {
    targetPipelineName: pipelineName,
    targetPipeline: pipeline,
    referencesStreamManagedPipeline: false,
  };
}

async function tryGettingPipeline({
  scopedClusterClient,
  id,
}: {
  scopedClusterClient: IScopedClusterClient;
  id: string;
}) {
  return scopedClusterClient.asCurrentUser.ingest
    .getPipeline({ id })
    .then((response) => response[id])
    .catch((error) => {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    });
}

type UnwrapPromise<T extends Promise<any>> = T extends Promise<infer Value> ? Value : never;

async function ensureStreamManagedPipelineReference(
  scopedClusterClient: IScopedClusterClient,
  pipelineName: string | undefined,
  definition: StreamDefinition,
  executionPlan: ExecutionPlanStep[],
  unmanagedAssets: UnwrapPromise<ReturnType<typeof getUnmanagedElasticsearchAssets>>
) {
  const streamManagedPipelineName = getProcessingPipelineName(definition.name);
  if (pipelineName === streamManagedPipelineName) {
    // the data stream is already calling the stream managed pipeline directly
    return;
  }
  if (!pipelineName) {
    // no ingest pipeline, we need to update the template to call the stream managed pipeline as
    // the default pipeline
    const indexTemplateAsset = unmanagedAssets.find((asset) => asset.type === 'index_template');
    if (!indexTemplateAsset) {
      throw new Error(`Could not find index template for stream ${definition.name}`);
    }
    const indexTemplate = (
      await scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
        name: indexTemplateAsset.id,
      })
    ).index_templates[0].index_template;
    const updatedTemplate: IndicesIndexTemplate = {
      ...indexTemplate,
      template: {
        ...indexTemplate.template,
        settings: {
          ...indexTemplate.template?.settings,
          index: {
            ...indexTemplate.template?.settings?.index,
            default_pipeline: streamManagedPipelineName,
          },
        },
      },
    };
    executionPlan.push({
      method: 'PUT',
      path: `/_index_template/${indexTemplateAsset.id}`,
      body: updatedTemplate as unknown as Record<string, unknown>,
    });

    // rollover the data stream to apply the new default pipeline
    executionPlan.push({
      method: 'POST',
      path: `/${definition.name}/_rollover`,
    });
    return;
  }
  const { targetPipelineName, targetPipeline, referencesStreamManagedPipeline } =
    await findStreamManagedPipelineReference(scopedClusterClient, pipelineName, definition.name);
  if (!referencesStreamManagedPipeline) {
    const callStreamManagedPipelineProcessor: IngestProcessorContainer = {
      pipeline: {
        name: streamManagedPipelineName,
        if: `ctx._index == '${definition.name}'`,
        ignore_missing_pipeline: true,
        description:
          "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
      },
    };
    executionPlan.push({
      method: 'PUT',
      path: `/_ingest/pipeline/${targetPipelineName}`,
      body: set(
        { ...targetPipeline },
        'processors',
        (targetPipeline.processors || []).concat(callStreamManagedPipelineProcessor)
      ),
    });
  }
}

export async function syncUnwiredStreamDefinitionObjects({
  definition,
  dataStream,
  scopedClusterClient,
}: SyncStreamParamsBase & {
  dataStream: IndicesDataStream;
  definition: UnwiredStreamDefinition;
}) {
  if (definition.ingest.routing.length) {
    throw new Error('Unmanaged streams cannot have managed children, coming soon');
  }
  const unmanagedAssets = await getUnmanagedElasticsearchAssets({
    dataStream,
    scopedClusterClient,
  });
  const executionPlan: ExecutionPlanStep[] = [];
  const streamManagedPipelineName = getProcessingPipelineName(definition.name);
  const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;
  await ensureStreamManagedPipelineReference(
    scopedClusterClient,
    pipelineName,
    definition,
    executionPlan,
    unmanagedAssets
  );

  if (definition.ingest.processing.length) {
    // if the stream has processing, we need to create or update the stream managed pipeline
    executionPlan.push({
      method: 'PUT',
      path: `/_ingest/pipeline/${streamManagedPipelineName}`,
      body: generateClassicIngestPipelineBody(definition),
    });
  } else {
    const pipelineExists = Boolean(
      await tryGettingPipeline({ scopedClusterClient, id: streamManagedPipelineName })
    );
    // no processing, just delete the pipeline if it exists. The reference to the pipeline won't break anything
    if (pipelineExists) {
      executionPlan.push({
        method: 'DELETE',
        path: `/_ingest/pipeline/${streamManagedPipelineName}`,
      });
    }
  }

  await executePlan(executionPlan, scopedClusterClient);
}

async function executePlan(
  executionPlan: ExecutionPlanStep[],
  scopedClusterClient: IScopedClusterClient
) {
  for (const step of executionPlan) {
    await scopedClusterClient.asCurrentUser.transport.request({
      method: step.method,
      path: step.path,
      body: step.body,
    });
  }
}

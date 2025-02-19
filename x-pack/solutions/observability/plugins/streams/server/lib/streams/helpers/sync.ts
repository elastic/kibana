/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  ElasticsearchAsset,
  StreamDefinition,
  UnwiredStreamDefinition,
  WiredStreamDefinition,
  isInheritLifecycle,
} from '@kbn/streams-schema';
import { isResponseError } from '@kbn/es-errors';
import {
  IndicesDataStream,
  IndicesIndexTemplate,
  IngestPipeline,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { set } from '@kbn/safer-lodash-set';
import {
  generateUnwiredBaseLayer,
  generateUnwiredLayer,
  generateWiredLayer,
} from '../component_templates/generate_layer';
import { upsertComponent } from '../component_templates/manage_component_templates';
import { upsertIngestPipeline } from '../ingest_pipelines/manage_ingest_pipelines';
import {
  generateClassicIngestPipelineBody,
  generateIngestPipeline,
} from '../ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from '../ingest_pipelines/generate_reroute_pipeline';
import { upsertTemplate } from '../index_templates/manage_index_templates';
import {
  generateWiredIndexTemplate,
  generateUnwiredIndexTemplate,
} from '../index_templates/generate_index_template';
import {
  rolloverDataStreamIfNecessary,
  upsertDataStream,
} from '../data_streams/manage_data_streams';
import { getUnmanagedElasticsearchAssets } from '../stream_crud';
import { getProcessingPipelineName } from '../ingest_pipelines/name';
import { getIndexTemplateName } from '../index_templates/name';

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
  const componentTemplate = generateWiredLayer(definition, isServerless);
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
    template: generateWiredIndexTemplate(definition.name, isServerless),
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

async function ensureStreamManagedPipelineReference(
  scopedClusterClient: IScopedClusterClient,
  pipelineName: string | undefined,
  definition: StreamDefinition,
  unmanagedAssets: ElasticsearchAsset[]
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

    await scopedClusterClient.asCurrentUser.indices.putIndexTemplate({
      name: indexTemplateAsset.id,
      ...updatedTemplate,
    });

    // rollover the data stream to apply the new default pipeline
    await scopedClusterClient.asCurrentUser.indices.rollover({
      alias: definition.name,
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

    await scopedClusterClient.asCurrentUser.ingest.putPipeline(
      set(
        { ...targetPipeline, id: targetPipelineName },
        'processors',
        (targetPipeline.processors || []).concat(callStreamManagedPipelineProcessor)
      )
    );
  }
}

export async function syncUnwiredStreamDefinitionObjects({
  definition,
  dataStream,
  scopedClusterClient,
  logger,
  isServerless,
}: SyncStreamParamsBase & {
  dataStream: IndicesDataStream;
  definition: UnwiredStreamDefinition;
  isServerless: boolean;
}) {
  if (definition.ingest.routing.length) {
    throw new Error('Unmanaged streams cannot have managed children, coming soon');
  }
  const unmanagedAssets = await getUnmanagedElasticsearchAssets({
    dataStream,
    scopedClusterClient,
  });
  const streamManagedPipelineName = getProcessingPipelineName(definition.name);
  const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;
  await ensureStreamManagedPipelineReference(
    scopedClusterClient,
    pipelineName,
    definition,
    unmanagedAssets
  );

  if (definition.ingest.processing.length) {
    // if the stream has processing, we need to create or update the stream managed pipeline
    await scopedClusterClient.asCurrentUser.ingest.putPipeline({
      id: streamManagedPipelineName,
      ...generateClassicIngestPipelineBody(definition),
    });
  } else {
    const pipelineExists = Boolean(
      await tryGettingPipeline({ scopedClusterClient, id: streamManagedPipelineName })
    );
    // no processing, just delete the pipeline if it exists. The reference to the pipeline won't break anything
    if (pipelineExists) {
      await scopedClusterClient.asCurrentUser.ingest.deletePipeline({
        id: streamManagedPipelineName,
      });
    }
  }

  if (requiresForkedTemplate(definition)) {
    await ensureForkedIndexTemplate({
      unmanagedAssets,
      definition,
      scopedClusterClient,
      logger,
      isServerless,
    });

    await upsertComponent({
      logger,
      esClient: scopedClusterClient.asCurrentUser,
      component: generateUnwiredLayer(definition, isServerless),
    });
  }
}

async function ensureForkedIndexTemplate({
  definition,
  unmanagedAssets,
  scopedClusterClient,
  logger,
  isServerless,
}: {
  definition: UnwiredStreamDefinition;
  unmanagedAssets: ElasticsearchAsset[];
  scopedClusterClient: IScopedClusterClient;
  logger: Logger;
  isServerless: boolean;
}) {
  const forkedTemplate = unmanagedAssets.find(
    ({ type, id }) => type === 'index_template' && id === getIndexTemplateName(definition.name)
  );
  if (forkedTemplate) {
    return;
  }

  const template = unmanagedAssets.find(({ type }) => type === 'index_template');
  if (!template) {
    throw new Error(`Could not find index template for stream [${definition.name}]`);
  }

  const {
    index_templates: [{ index_template: indexTemplate }],
  } = await scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
    name: template.id,
  });

  await Promise.all([
    upsertComponent({
      logger,
      esClient: scopedClusterClient.asCurrentUser,
      component: generateUnwiredBaseLayer(definition, indexTemplate),
    }),

    upsertTemplate({
      logger,
      esClient: scopedClusterClient.asCurrentUser,
      template: generateUnwiredIndexTemplate(definition.name, indexTemplate, isServerless),
    }),
  ]);
}

function requiresForkedTemplate(definition: UnwiredStreamDefinition) {
  const hasLifecycleChanges = !isInheritLifecycle(definition.ingest.lifecycle);
  return hasLifecycleChanges;
}

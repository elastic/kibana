/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { IngestPipeline, IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { set } from '@kbn/safer-lodash-set';
import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import {
  IngestStreamDefinition,
  WiredStreamDefinition,
  StreamDefinition,
  ListStreamsResponse,
  isWiredStream,
  FieldDefinition,
} from '@kbn/streams-schema';
import { omit } from 'lodash';
import { STREAMS_INDEX } from '../../../common/constants';
import { generateLayer } from './component_templates/generate_layer';
import { deleteComponent, upsertComponent } from './component_templates/manage_component_templates';
import { getComponentTemplateName } from './component_templates/name';
import {
  deleteDataStream,
  rolloverDataStreamIfNecessary,
  upsertDataStream,
} from './data_streams/manage_data_streams';
import { DefinitionNotFound } from './errors';
import { MalformedFields } from './errors/malformed_fields';
import { getAncestors } from './helpers/hierarchy';
import { generateIndexTemplate } from './index_templates/generate_index_template';
import { deleteTemplate, upsertTemplate } from './index_templates/manage_index_templates';
import { getIndexTemplateName } from './index_templates/name';
import {
  generateClassicIngestPipelineBody,
  generateIngestPipeline,
} from './ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from './ingest_pipelines/generate_reroute_pipeline';
import {
  deleteIngestPipeline,
  upsertIngestPipeline,
} from './ingest_pipelines/manage_ingest_pipelines';
import { getProcessingPipelineName, getReroutePipelineName } from './ingest_pipelines/name';

interface BaseParams {
  scopedClusterClient: IScopedClusterClient;
}

interface BaseParamsWithDefinition extends BaseParams {
  definition: StreamDefinition;
}

interface DeleteStreamParams extends BaseParams {
  id: string;
  logger: Logger;
}

export async function deleteUnmanagedStreamObjects({
  id,
  scopedClusterClient,
  logger,
}: DeleteStreamParams) {
  const unmanagedAssets = await getUnmanagedElasticsearchAssets({
    name: id,
    scopedClusterClient,
  });
  const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;
  if (pipelineName) {
    const { targetPipelineName, targetPipeline, referencesStreamManagedPipeline } =
      await findStreamManagedPipelineReference(scopedClusterClient, pipelineName, id);
    if (referencesStreamManagedPipeline) {
      const streamManagedPipelineName = getProcessingPipelineName(id);
      const updatedProcessors = targetPipeline.processors!.filter(
        (processor) =>
          !(processor.pipeline && processor.pipeline.name === streamManagedPipelineName)
      );
      await scopedClusterClient.asCurrentUser.ingest.putPipeline({
        id: targetPipelineName,
        body: {
          processors: updatedProcessors,
        },
      });
    }
  }
  await deleteDataStream({
    esClient: scopedClusterClient.asCurrentUser,
    name: id,
    logger,
  });
  try {
    await deleteIngestPipeline({
      esClient: scopedClusterClient.asCurrentUser,
      id: getProcessingPipelineName(id),
      logger,
    });
  } catch (e) {
    // if the pipeline doesn't exist, we don't need to delete it
    if (!(e.meta?.statusCode === 404)) {
      throw e;
    }
  }
  try {
    await scopedClusterClient.asInternalUser.delete({
      id,
      index: STREAMS_INDEX,
      refresh: 'wait_for',
    });
  } catch (e) {
    if (e.meta?.statusCode !== 404) {
      throw e;
    }
  }
}

export async function deleteStreamObjects({ id, scopedClusterClient, logger }: DeleteStreamParams) {
  await deleteDataStream({
    esClient: scopedClusterClient.asCurrentUser,
    name: id,
    logger,
  });
  await deleteTemplate({
    esClient: scopedClusterClient.asCurrentUser,
    name: getIndexTemplateName(id),
    logger,
  });
  await deleteComponent({
    esClient: scopedClusterClient.asCurrentUser,
    name: getComponentTemplateName(id),
    logger,
  });
  await deleteIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    id: getProcessingPipelineName(id),
    logger,
  });
  await deleteIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    id: getReroutePipelineName(id),
    logger,
  });
  await scopedClusterClient.asInternalUser.delete({
    id,
    index: STREAMS_INDEX,
    refresh: 'wait_for',
  });
}

async function upsertInternalStream({ definition, scopedClusterClient }: BaseParamsWithDefinition) {
  return scopedClusterClient.asInternalUser.index({
    id: definition.name,
    index: STREAMS_INDEX,
    document: { ...omit(definition, 'elasticsearch_assets') },
    refresh: 'wait_for',
  });
}

type ListStreamsParams = BaseParams;

export async function listStreams({
  scopedClusterClient,
}: ListStreamsParams): Promise<ListStreamsResponse> {
  const response = await scopedClusterClient.asInternalUser.search<WiredStreamDefinition>({
    index: STREAMS_INDEX,
    size: 10000,
    sort: [{ name: 'asc' }],
  });

  const dataStreams = await listDataStreamsAsStreams({ scopedClusterClient });
  let definitions = response.hits.hits.map((hit) => ({ ...hit._source! }));
  const hasAccess = await Promise.all(
    definitions.map((definition) => checkReadAccess({ id: definition.name, scopedClusterClient }))
  );
  definitions = definitions.filter((_, index) => hasAccess[index]);
  const definitionMap = new Map<string, StreamDefinition>(
    definitions.map((definition) => [definition.name, definition])
  );
  dataStreams.forEach((dataStream) => {
    if (!definitionMap.has(dataStream.name)) {
      definitionMap.set(dataStream.name, dataStream);
    }
  });

  return {
    streams: Array.from(definitionMap.values()),
  };
}

export async function listDataStreamsAsStreams({
  scopedClusterClient,
}: ListStreamsParams): Promise<IngestStreamDefinition[]> {
  const response = await scopedClusterClient.asInternalUser.indices.getDataStream();
  return response.data_streams
    .filter((dataStream) => dataStream.template.endsWith('@stream') === false)
    .map((dataStream) => ({
      name: dataStream.name,
      stream: {
        ingest: {
          processing: [],
          routing: [],
        },
      },
    }));
}

interface ReadStreamParams extends BaseParams {
  id: string;
  skipAccessCheck?: boolean;
}

export async function readStream({
  id,
  scopedClusterClient,
  skipAccessCheck,
}: ReadStreamParams): Promise<StreamDefinition> {
  try {
    const response = await scopedClusterClient.asInternalUser.get<StreamDefinition>({
      id,
      index: STREAMS_INDEX,
    });
    const definition = response._source as StreamDefinition;
    if (!skipAccessCheck) {
      const hasAccess = await checkReadAccess({ id, scopedClusterClient });
      if (!hasAccess) {
        throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
      }
    }
    return definition;
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return readDataStreamAsStream({ id, scopedClusterClient, skipAccessCheck });
    }
    throw e;
  }
}

export async function readDataStreamAsStream({ id, scopedClusterClient }: ReadStreamParams) {
  const definition: IngestStreamDefinition = {
    name: id,
    stream: {
      ingest: {
        routing: [],
        processing: [],
      },
    },
  };

  definition.elasticsearch_assets = await getUnmanagedElasticsearchAssets({
    name: id,
    scopedClusterClient,
  });

  return definition;
}

interface ReadUnmanagedAssetsParams extends BaseParams {
  name: string;
}

async function getUnmanagedElasticsearchAssets({
  name,
  scopedClusterClient,
}: ReadUnmanagedAssetsParams) {
  let dataStream: IndicesDataStream;
  try {
    const response = await scopedClusterClient.asInternalUser.indices.getDataStream({ name });
    dataStream = response.data_streams[0];
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      throw new DefinitionNotFound(`Stream definition for ${name} not found.`);
    }
    throw e;
  }

  // retrieve linked index template, component template and ingest pipeline
  const templateName = dataStream.template;
  const componentTemplates: string[] = [];
  const template = await scopedClusterClient.asInternalUser.indices.getIndexTemplate({
    name: templateName,
  });
  if (template.index_templates.length) {
    template.index_templates[0].index_template.composed_of.forEach((componentTemplateName) => {
      componentTemplates.push(componentTemplateName);
    });
  }
  const writeIndexName = dataStream.indices.at(-1)?.index_name!;
  const currentIndex = await scopedClusterClient.asInternalUser.indices.get({
    index: writeIndexName,
  });
  const ingestPipelineId = currentIndex[writeIndexName].settings?.index?.default_pipeline!;

  return [
    {
      type: 'ingest_pipeline' as const,
      id: ingestPipelineId,
    },
    ...componentTemplates.map((componentTemplateName) => ({
      type: 'component_template' as const,
      id: componentTemplateName,
    })),
    {
      type: 'index_template' as const,
      id: templateName,
    },
    {
      type: 'data_stream' as const,
      id: name,
    },
  ];
}

interface ReadAncestorsParams extends BaseParams {
  id: string;
}

export interface ReadAncestorsResponse {
  ancestors: StreamDefinition[];
}

export async function readAncestors({
  id,
  scopedClusterClient,
}: ReadAncestorsParams): Promise<{ ancestors: WiredStreamDefinition[] }> {
  const ancestorIds = getAncestors(id);

  return {
    ancestors: await Promise.all(
      ancestorIds.map(
        (ancestorId) =>
          readStream({
            scopedClusterClient,
            id: ancestorId,
            skipAccessCheck: true,
          }) as unknown as WiredStreamDefinition
      )
    ),
  };
}

interface ReadDescendantsParams extends BaseParams {
  id: string;
}

export async function readDescendants({ id, scopedClusterClient }: ReadDescendantsParams) {
  const response = await scopedClusterClient.asInternalUser.search<WiredStreamDefinition>({
    index: STREAMS_INDEX,
    size: 10000,
    body: {
      query: {
        bool: {
          filter: {
            prefix: {
              id,
            },
          },
          must_not: {
            term: {
              id,
            },
          },
        },
      },
    },
  });
  return response.hits.hits.map((hit) => hit._source as WiredStreamDefinition);
}

export async function validateAncestorFields(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  fields: FieldDefinition
) {
  const { ancestors } = await readAncestors({
    id,
    scopedClusterClient,
  });
  for (const ancestor of ancestors) {
    for (const name in fields) {
      if (
        Object.hasOwn(fields, name) &&
        isWiredStream(ancestor) &&
        Object.entries(ancestor.stream.ingest.wired.fields).some(
          ([ancestorFieldName, attr]) =>
            attr.type !== fields[name].type && ancestorFieldName === name
        )
      ) {
        throw new MalformedFields(
          `Field ${name} is already defined with incompatible type in the parent stream ${ancestor.name}`
        );
      }
    }
  }
}

export async function validateDescendantFields(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  fields: FieldDefinition
) {
  const descendants = await readDescendants({
    id,
    scopedClusterClient,
  });
  for (const descendant of descendants) {
    for (const name in fields) {
      if (
        Object.hasOwn(fields, name) &&
        Object.entries(descendant.stream.ingest.wired.fields).some(
          ([descendantFieldName, attr]) =>
            attr.type !== fields[name].type && descendantFieldName === name
        )
      ) {
        throw new MalformedFields(
          `Field ${name} is already defined with incompatible type in the child stream ${descendant.name}`
        );
      }
    }
  }
}

export async function checkStreamExists({ id, scopedClusterClient }: ReadStreamParams) {
  try {
    await readStream({ id, scopedClusterClient });
    return true;
  } catch (e) {
    if (e instanceof DefinitionNotFound) {
      return false;
    }
    throw e;
  }
}

interface CheckReadAccessParams extends BaseParams {
  id: string;
}

export async function checkReadAccess({
  id,
  scopedClusterClient,
}: CheckReadAccessParams): Promise<boolean> {
  try {
    return await scopedClusterClient.asCurrentUser.indices.exists({ index: id });
  } catch (e) {
    return false;
  }
}

interface SyncStreamParams {
  scopedClusterClient: IScopedClusterClient;
  definition: StreamDefinition;
  rootDefinition?: StreamDefinition;
  logger: Logger;
}

export async function syncStream({
  scopedClusterClient,
  definition,
  rootDefinition,
  logger,
}: SyncStreamParams) {
  if (!isWiredStream(definition)) {
    await syncUnmanagedStream({ scopedClusterClient, definition, logger });
    await upsertInternalStream({
      scopedClusterClient,
      definition,
    });
    return;
  }
  const componentTemplate = generateLayer(definition.name, definition);
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
  const reroutePipeline = await generateReroutePipeline({
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
    template: generateIndexTemplate(definition.name),
  });
  if (rootDefinition) {
    const parentReroutePipeline = await generateReroutePipeline({
      definition: rootDefinition,
    });

    await upsertIngestPipeline({
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      pipeline: parentReroutePipeline,
    });
  }
  await upsertDataStream({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    name: definition.name,
  });
  await upsertInternalStream({
    scopedClusterClient,
    definition,
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

async function syncUnmanagedStream({ scopedClusterClient, definition }: SyncStreamParams) {
  if (isWiredStream(definition)) {
    throw new Error('Got an unmanaged stream that is marked as managed');
  }
  if (definition.stream.ingest.routing.length) {
    throw new Error('Unmanaged streams cannot have managed children, coming soon');
  }
  const unmanagedAssets = await getUnmanagedElasticsearchAssets({
    name: definition.name,
    scopedClusterClient,
  });
  const executionPlan: ExecutionPlanStep[] = [];
  const streamManagedPipelineName = getProcessingPipelineName(definition.name);
  const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;
  if (!pipelineName) {
    throw new Error('Unmanaged stream needs a default ingest pipeline');
  }
  if (pipelineName === streamManagedPipelineName) {
    throw new Error('Unmanaged stream cannot have the @stream pipeline as the default pipeline');
  }
  await ensureStreamManagedPipelineReference(
    scopedClusterClient,
    pipelineName,
    definition,
    executionPlan
  );

  if (definition.stream.ingest.processing.length) {
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

async function ensureStreamManagedPipelineReference(
  scopedClusterClient: IScopedClusterClient,
  pipelineName: string,
  definition: StreamDefinition,
  executionPlan: ExecutionPlanStep[]
) {
  const streamManagedPipelineName = getProcessingPipelineName(definition.name);
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

async function tryGettingPipeline({ scopedClusterClient, id }: ReadStreamParams) {
  try {
    return (await scopedClusterClient.asCurrentUser.ingest.getPipeline({ id }))[id];
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return;
    }
    throw e;
  }
}

export async function streamsEnabled({ scopedClusterClient }: BaseParams) {
  return await scopedClusterClient.asInternalUser.indices.exists({
    index: STREAMS_INDEX,
  });
}

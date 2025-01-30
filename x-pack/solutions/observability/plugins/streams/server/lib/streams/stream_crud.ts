/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesDataStream,
  IndicesDataStreamLifecycleWithRollover,
  IngestPipeline,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { UnwiredIngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { deleteComponent } from './component_templates/manage_component_templates';
import { getComponentTemplateName } from './component_templates/name';
import { deleteDataStream } from './data_streams/manage_data_streams';
import { deleteTemplate } from './index_templates/manage_index_templates';
import { getIndexTemplateName } from './index_templates/name';
import { deleteIngestPipeline } from './ingest_pipelines/manage_ingest_pipelines';
import { getProcessingPipelineName, getReroutePipelineName } from './ingest_pipelines/name';
import { DefinitionNotFoundError } from './errors/definition_not_found_error';

interface BaseParams {
  scopedClusterClient: IScopedClusterClient;
}

interface DeleteStreamParams extends BaseParams {
  id: string;
  logger: Logger;
}

export function getDataStreamLifecycle(
  dataStream: IndicesDataStream
): UnwiredIngestStreamEffectiveLifecycle {
  if (
    dataStream.ilm_policy &&
    (!dataStream.lifecycle || typeof dataStream.prefer_ilm === 'undefined' || dataStream.prefer_ilm)
  ) {
    return { ilm: { policy: dataStream.ilm_policy } };
  }

  const lifecycle = dataStream.lifecycle as
    | (IndicesDataStreamLifecycleWithRollover & {
        enabled: boolean;
      })
    | undefined;
  if (lifecycle && lifecycle.enabled) {
    return {
      dsl: {
        data_retention: lifecycle.data_retention ? String(lifecycle.data_retention) : undefined,
      },
    };
  }

  return { disabled: {} };
}

export async function deleteUnmanagedStreamObjects({
  id,
  scopedClusterClient,
  logger,
}: DeleteStreamParams) {
  const dataStream = await getDataStream({ name: id, scopedClusterClient });
  const unmanagedAssets = await getUnmanagedElasticsearchAssets({
    dataStream,
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
}

interface ReadStreamParams extends BaseParams {
  id: string;
  skipAccessCheck?: boolean;
}

interface ReadUnmanagedAssetsParams extends BaseParams {
  dataStream: IndicesDataStream;
}

export async function getUnmanagedElasticsearchAssets({
  dataStream,
  scopedClusterClient,
}: ReadUnmanagedAssetsParams) {
  // retrieve linked index template, component template and ingest pipeline
  const templateName = dataStream.template;
  const componentTemplates: string[] = [];
  const template = await scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
    name: templateName,
  });
  if (template.index_templates.length) {
    template.index_templates[0].index_template.composed_of.forEach((componentTemplateName) => {
      componentTemplates.push(componentTemplateName);
    });
  }
  const writeIndexName = dataStream.indices.at(-1)?.index_name!;
  const currentIndex = await scopedClusterClient.asCurrentUser.indices.get({
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
      id: dataStream.name,
    },
  ];
}

interface CheckAccessParams extends BaseParams {
  id: string;
}

export async function checkAccess({
  id,
  scopedClusterClient,
}: CheckAccessParams): Promise<{ read: boolean; write: boolean }> {
  return checkAccessBulk({
    ids: [id],
    scopedClusterClient,
  }).then((privileges) => privileges[id]);
}

interface CheckAccessBulkParams extends BaseParams {
  ids: string[];
}

export async function checkAccessBulk({
  ids,
  scopedClusterClient,
}: CheckAccessBulkParams): Promise<Record<string, { read: boolean; write: boolean }>> {
  if (!ids.length) {
    return {};
  }
  const hasPrivilegesResponse = await scopedClusterClient.asCurrentUser.security.hasPrivileges({
    index: [{ names: ids, privileges: ['read', 'write'] }],
  });

  return Object.fromEntries(
    ids.map((id) => {
      const hasReadAccess = hasPrivilegesResponse.index[id].read === true;
      const hasWriteAccess = hasPrivilegesResponse.index[id].write === true;
      return [id, { read: hasReadAccess, write: hasWriteAccess }];
    })
  );
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

async function getDataStream({
  name,
  scopedClusterClient,
}: {
  name: string;
  scopedClusterClient: IScopedClusterClient;
}): Promise<IndicesDataStream> {
  let dataStream: IndicesDataStream | undefined;
  try {
    const response = await scopedClusterClient.asCurrentUser.indices.getDataStream({ name });
    dataStream = response.data_streams[0];
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      // fall through and throw not found
    } else {
      throw e;
    }
  }

  if (!dataStream) {
    throw new DefinitionNotFoundError(`Stream definition for ${name} not found.`);
  }
  return dataStream;
}

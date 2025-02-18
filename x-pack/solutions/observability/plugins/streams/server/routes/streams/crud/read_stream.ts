/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InheritedFieldDefinition,
  StreamGetResponse,
  WiredStreamGetResponse,
  findInheritedLifecycle,
  isGroupStreamDefinition,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { IScopedClusterClient } from '@kbn/core/server';
import { AssetClient } from '../../../lib/streams/assets/asset_client';
import { StreamsClient } from '../../../lib/streams/client';
import {
  getDataStreamLifecycle,
  getUnmanagedElasticsearchAssets,
} from '../../../lib/streams/stream_crud';

export async function readStream({
  name,
  assetClient,
  streamsClient,
  scopedClusterClient,
}: {
  name: string;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
  scopedClusterClient: IScopedClusterClient;
}): Promise<StreamGetResponse> {
  const [streamDefinition, dashboards] = await Promise.all([
    streamsClient.getStream(name),
    assetClient.getAssetIds({
      entityId: name,
      entityType: 'stream',
      assetType: 'dashboard',
    }),
  ]);

  if (isGroupStreamDefinition(streamDefinition)) {
    return {
      stream: streamDefinition,
      dashboards,
    };
  }

  // These queries are only relavant for IngestStreams
  const [ancestors, dataStream] = await Promise.all([
    streamsClient.getAncestors(name),
    streamsClient.getDataStream(name).catch((e) => {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    }),
  ]);

  if (isUnwiredStreamDefinition(streamDefinition)) {
    return {
      stream: streamDefinition,
      elasticsearch_assets: dataStream
        ? await getUnmanagedElasticsearchAssets({
            dataStream,
            scopedClusterClient,
          })
        : [],
      data_stream_exists: !!dataStream,
      effective_lifecycle: getDataStreamLifecycle(dataStream),
      dashboards,
      inherited_fields: {},
    };
  }

  const body: WiredStreamGetResponse = {
    stream: streamDefinition,
    dashboards,
    effective_lifecycle: findInheritedLifecycle(streamDefinition, ancestors),
    inherited_fields: ancestors.reduce((acc, def) => {
      Object.entries(def.ingest.wired.fields).forEach(([key, fieldDef]) => {
        acc[key] = { ...fieldDef, from: def.name };
      });
      return acc;
    }, {} as InheritedFieldDefinition),
  };

  return body;
}

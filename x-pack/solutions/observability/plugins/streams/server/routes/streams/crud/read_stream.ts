/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  IngestStreamGetResponse,
  InheritedFieldDefinition,
  WiredStreamGetResponse,
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
}): Promise<IngestStreamGetResponse> {
  const [streamDefinition, dashboards, ancestors, dataStream] = await Promise.all([
    streamsClient.getStream(name),
    assetClient.getAssetIds({
      entityId: name,
      entityType: 'stream',
      assetType: 'dashboard',
    }),
    streamsClient.getAncestors(name),
    streamsClient.getDataStream(name),
  ]);

  const lifecycle = getDataStreamLifecycle(dataStream);

  if (isUnwiredStreamDefinition(streamDefinition)) {
    return {
      stream: omit(streamDefinition, 'name'),
      elasticsearch_assets: await getUnmanagedElasticsearchAssets({
        dataStream,
        scopedClusterClient,
      }),
      lifecycle,
      dashboards,
      inherited_fields: {},
    };
  }

  const body: WiredStreamGetResponse = {
    stream: omit(streamDefinition, 'name'),
    dashboards,
    lifecycle,
    inherited_fields: ancestors.reduce((acc, def) => {
      Object.entries(def.ingest.wired.fields).forEach(([key, fieldDef]) => {
        acc[key] = { ...fieldDef, from: def.name };
      });
      return acc;
    }, {} as InheritedFieldDefinition),
  };

  return body;
}

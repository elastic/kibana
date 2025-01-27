/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  InheritedFieldDefinition,
  StreamGetResponse,
  WiredStreamGetResponse,
  isGroupedStreamDefinition,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { IScopedClusterClient } from '@kbn/core/server';
import { AssetClient } from '../../../lib/streams/assets/asset_client';
import { StreamsClient } from '../../../lib/streams/client';
import {
  getDataStreamLifecycle,
  getUnmanagedElasticsearchAssets,
} from '../../../lib/streams/stream_crud';
import { findInheritedLifecycle } from '../../../lib/streams/helpers/lifecycle';

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

  if (isGroupedStreamDefinition(streamDefinition)) {
    return {
      stream: omit(streamDefinition, 'name'),
      dashboards,
    };
  }

  // These queries are only relavate for IngestStreams
  const [ancestors, dataStream] = await Promise.all([
    streamsClient.getAncestors(name),
    streamsClient.getDataStream(name),
  ]);

  if (isUnwiredStreamDefinition(streamDefinition)) {
    return {
      stream: omit(streamDefinition, 'name'),
      elasticsearch_assets: await getUnmanagedElasticsearchAssets({
        dataStream,
        scopedClusterClient,
      }),
      effective_lifecycle: getDataStreamLifecycle(dataStream),
      dashboards,
      inherited_fields: {},
    };
  }

  const body: WiredStreamGetResponse = {
    stream: omit(streamDefinition, 'name'),
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

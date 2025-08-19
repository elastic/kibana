/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DataStreamAdapter } from './src/data_stream_adapter';
export { DataStreamSpacesAdapter } from './src/data_stream_spaces_adapter';

export { retryTransientEsErrors, ecsFieldMap } from '@kbn/index-adapter';
export type {
  SetComponentTemplateParams,
  SetIndexTemplateParams,
  InstallParams,
  EcsFieldMap,
} from '@kbn/index-adapter';

export type * from '@kbn/index-adapter/src/field_maps/types';

// Export new rollover and reindexing functionality
export { 
  rolloverDataStream, 
  shouldRolloverDataStream,
  type RolloverDataStreamParams,
} from './src/rollover_data_stream';

export { 
  reindexDataStreamDocuments, 
  getActiveReindexTasks,
  type ReindexDataStreamDocumentsParams,
  type ReindexTaskStatus,
} from './src/reindex_data_stream';

export {
  createOrUpdateDataStream,
  updateDataStreams,
  createDataStream,
  type CreateOrUpdateDataStreamParams,
  type CreateOrUpdateSpacesDataStreamParams,
  type CreateDataStreamParams,
} from './src/create_or_update_data_stream';

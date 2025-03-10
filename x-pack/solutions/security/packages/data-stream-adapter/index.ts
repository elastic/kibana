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

export * from '@kbn/index-adapter/src/field_maps/types';

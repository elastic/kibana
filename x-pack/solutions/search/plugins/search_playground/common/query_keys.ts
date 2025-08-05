/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SearchPlaygroundQueryKeys {
  PlaygroundsList = 'searchPlaygroundPlaygroundsList',
  SearchPlaygroundMutationKeys = 'search-preview-results',
  SearchPreviewResults = 'searchPlaygroundSearchPreviewResults',
  SearchQueryTest = 'searchPlaygroundQueryTest',
  LoadConnectors = 'searchPlaygroundLoadConnectors',
  LLMsQuery = 'searchPlaygroundLLMsQuery',
  QueryIndices = 'searchPlaygroundQueryIndices',
  IndicesFields = 'searchPlaygroundIndicesFields',
  IndexMappings = 'searchPlaygroundIndexMappings',
}

export enum SearchPlaygroundMutationKeys {
  DeletePlayground = 'searchPlaygroundDeletePlayground',
  SavePlayground = 'searchPlaygroundSavePlayground',
  UpdatePlayground = 'searchPlaygroundUpdatePlayground',
}

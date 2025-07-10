/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchIndices,
  SearchStart,
  SearchIndexManagement,
} from '@kbn/deeplinks-search/deep_links';
import {
  SEARCH_INDICES,
  SEARCH_INDICES_START,
  SEARCH_INDEX_MANAGEMENT,
} from '@kbn/deeplinks-search';

export const PLUGIN_ID = 'searchIndices';
export const PLUGIN_NAME = 'searchIndices';
export const START_APP_ID: SearchStart = SEARCH_INDICES_START;
export const INDICES_APP_ID: SearchIndices = SEARCH_INDICES;
export const SEARCH_INDEX_MANAGEMENT_APP_ID: SearchIndexManagement = SEARCH_INDEX_MANAGEMENT;
export type { IndicesStatusResponse, UserStartPrivilegesResponse } from './types';

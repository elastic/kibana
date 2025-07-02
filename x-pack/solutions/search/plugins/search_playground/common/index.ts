/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Pagination } from './types';
export { APIRoutes, type PlaygroundSavedObject } from './types';

export const PLUGIN_ID = 'searchPlayground';
export const PLUGIN_NAME = i18n.translate('xpack.searchPlayground.plugin.name', {
  defaultMessage: 'Playground',
});
export const PLUGIN_PATH = '/app/search_playground';

export const SEARCH_MODE_FEATURE_FLAG_ID = 'searchPlayground:searchModeEnabled';

export const DEFAULT_PAGINATION: Pagination = {
  from: 0,
  size: 10,
  total: 0,
};

export const ContextModelLimitError = i18n.translate(
  'xpack.searchPlayground.error.contextLimitError',
  {
    defaultMessage: 'Context exceeds the model limit',
  }
);

export enum ROUTE_VERSIONS {
  v1 = '1',
}

export const PLAYGROUND_SAVED_OBJECT_TYPE = 'search_playground';

export const DEFAULT_CONTEXT_DOCUMENTS = 3;

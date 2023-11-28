/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { indicesApi } from '../apis/management/index_management/lib/indices.api';
import { mappingsApi } from '../apis/management/index_management/lib/mappings.api';
import { indicesHelpers } from '../apis/management/index_management/lib/indices.helpers';

export function IndexManagementProvider({ getService }: FtrProviderContext) {
  return {
    indices: {
      api: indicesApi(getService),
      helpers: indicesHelpers(getService),
    },
    mappings: {
      api: mappingsApi(getService),
    },
  };
}

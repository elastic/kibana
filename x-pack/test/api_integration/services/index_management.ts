/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { indicesApi } from '../apis/management/index_management/lib/indices.api';
import { indicesHelpers } from '../apis/management/index_management/lib/indices.helpers';
import { componentTemplatesApi } from '../apis/management/index_management/lib/component_templates.api';
import { componentTemplateHelpers } from '../apis/management/index_management/lib/component_template.helpers';

export function IndexManagementProvider({ getService }: FtrProviderContext) {
  return {
    indices: {
      api: indicesApi(getService),
      helpers: indicesHelpers(getService),
    },
    componentTemplates: {
      api: componentTemplatesApi(getService),
      helpers: componentTemplateHelpers(getService),
    }
  };
}

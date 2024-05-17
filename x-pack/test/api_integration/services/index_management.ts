/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clusterNodesApi } from '../apis/management/index_management/lib/cluster_nodes.api';
import { componentTemplateHelpers } from '../apis/management/index_management/lib/component_template.helpers';
import { componentTemplatesApi } from '../apis/management/index_management/lib/component_templates.api';
import { datastreamsHelpers } from '../apis/management/index_management/lib/datastreams.helpers';
import { enrichPoliciesApi } from '../apis/management/index_management/lib/enrich_policies.api';
import { enrichPoliciesHelpers } from '../apis/management/index_management/lib/enrich_policies.helpers';
import { indicesApi } from '../apis/management/index_management/lib/indices.api';
import { indicesHelpers } from '../apis/management/index_management/lib/indices.helpers';
import { mappingsApi } from '../apis/management/index_management/lib/mappings.api';
import { settingsApi } from '../apis/management/index_management/lib/settings.api';
import { templatesApi } from '../apis/management/index_management/lib/templates.api';
import { templatesHelpers } from '../apis/management/index_management/lib/templates.helpers';
import { FtrProviderContext } from '../ftr_provider_context';

export function IndexManagementProvider({ getService }: FtrProviderContext) {
  return {
    indices: {
      api: indicesApi(getService),
      helpers: indicesHelpers(getService),
    },
    componentTemplates: {
      api: componentTemplatesApi(getService),
      helpers: componentTemplateHelpers(getService),
    },
    clusterNodes: {
      api: clusterNodesApi(getService),
    },
    datastreams: {
      helpers: datastreamsHelpers(getService),
    },
    mappings: {
      api: mappingsApi(getService),
    },
    templates: {
      api: templatesApi(getService),
      helpers: templatesHelpers(getService),
    },
    settings: {
      api: settingsApi(getService),
    },
    enrichPolicies: {
      api: enrichPoliciesApi(getService),
      helpers: enrichPoliciesHelpers(getService),
    },
  };
}

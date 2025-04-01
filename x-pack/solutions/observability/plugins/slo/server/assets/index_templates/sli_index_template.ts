/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLI_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLI_INDEX_TEMPLATE_NAME,
  SLI_INDEX_TEMPLATE_PATTERN,
  SLO_RESOURCES_VERSION,
} from '../../../common/constants';

export const SLI_INDEX_TEMPLATE = {
  name: SLI_INDEX_TEMPLATE_NAME,
  index_patterns: [SLI_INDEX_TEMPLATE_PATTERN],
  composed_of: [SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME, SLI_COMPONENT_TEMPLATE_SETTINGS_NAME],
  priority: 500,
  _meta: {
    description: 'Template for SLO rollup data',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};

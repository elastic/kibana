/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME,
  COMPOSITE_SUMMARY_INDEX_TEMPLATE_PATTERN,
  COMPOSITE_SLO_RESOURCES_VERSION,
  SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
} from '../../../common/constants';

export const COMPOSITE_SUMMARY_INDEX_TEMPLATE: IndicesPutIndexTemplateRequest = {
  name: COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME,
  index_patterns: [COMPOSITE_SUMMARY_INDEX_TEMPLATE_PATTERN],
  composed_of: [
    COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
    SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  ],
  priority: 600,
  _meta: {
    description: 'SLO composite summary index template',
    version: COMPOSITE_SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};

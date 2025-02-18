/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLO_RESOURCES_VERSION,
  SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SUMMARY_INDEX_TEMPLATE_NAME,
  SUMMARY_INDEX_TEMPLATE_PATTERN,
} from '../../../common/constants';

export const SUMMARY_INDEX_TEMPLATE = {
  name: SUMMARY_INDEX_TEMPLATE_NAME,
  index_patterns: [SUMMARY_INDEX_TEMPLATE_PATTERN],
  composed_of: [SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME, SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME],
  priority: 500,
  _meta: {
    description: 'SLO summary index template',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};

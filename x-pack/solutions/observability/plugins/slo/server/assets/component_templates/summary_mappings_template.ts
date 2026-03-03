/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  SLO_RESOURCES_VERSION,
  SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
} from '../../../common/constants';
import { SUMMARY_MAPPING_PROPERTIES } from '../../../common/summary_mapping_properties';

export const SUMMARY_MAPPINGS_TEMPLATE: ClusterPutComponentTemplateRequest = {
  name: SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  template: {
    mappings: {
      properties: SUMMARY_MAPPING_PROPERTIES,
    },
  },
  _meta: {
    description: 'SLO summary mappings template',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};

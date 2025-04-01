/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLO_RESOURCES_VERSION,
  SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
} from '../../../common/constants';

export const SUMMARY_SETTINGS_TEMPLATE = {
  name: SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  template: {
    settings: {
      auto_expand_replicas: '0-1',
      hidden: true,
    },
  },
  _meta: {
    description: 'SLO summary settings template',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};

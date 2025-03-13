/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLI_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_RESOURCES_VERSION,
} from '../../../common/constants';

export const SLI_SETTINGS_TEMPLATE = {
  name: SLI_COMPONENT_TEMPLATE_SETTINGS_NAME,
  template: {
    settings: {
      auto_expand_replicas: '0-1',
      hidden: true,
    },
  },
  _meta: {
    description: 'Settings for SLO rollup data',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};

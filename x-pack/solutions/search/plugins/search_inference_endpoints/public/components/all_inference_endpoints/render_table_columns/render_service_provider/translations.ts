/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MIT_LICENSE = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.mitLicense',
  {
    defaultMessage: 'License: MIT',
  }
);

export const TOKEN_BASED_BILLING_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.elastic.description',
  {
    defaultMessage: 'Runs on GPUs (token-based billing)',
  }
);

export const RESOURCE_BASED_BILLING_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.description',
  {
    defaultMessage: 'Runs on ML Nodes (resource-based billing)',
  }
);

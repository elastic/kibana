/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'searchInferenceEndpoints';
export const PLUGIN_NAME = 'Inference Endpoints';

export const PLUGIN_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceEndpointsTitle',
  {
    defaultMessage: 'Inference endpoints',
  }
);

export const INFERENCE_ENDPOINTS_QUERY_KEY = 'inferenceEndpointsQueryKey';
export const TRAINED_MODEL_STATS_QUERY_KEY = 'trainedModelStats';

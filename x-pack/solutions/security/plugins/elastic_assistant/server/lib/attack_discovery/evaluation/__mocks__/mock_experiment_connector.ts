/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

export const mockExperimentConnector: InferenceConnector = {
  type: InferenceConnectorType.Gemini,
  name: 'Gemini 1.5 Pro 002',
  connectorId: 'gemini-1-5-pro-002',
  config: {
    apiUrl: 'https://example.com',
    defaultModel: 'gemini-1.5-pro-002',
    gcpRegion: 'test-region',
    gcpProjectID: 'test-project-id',
  },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: true,
};

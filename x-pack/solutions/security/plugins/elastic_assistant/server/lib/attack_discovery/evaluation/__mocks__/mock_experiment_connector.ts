/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';

export const mockExperimentConnector: Connector = {
  name: 'Gemini 1.5 Pro 002',
  actionTypeId: '.gemini',
  config: {
    apiUrl: 'https://example.com',
    defaultModel: 'gemini-1.5-pro-002',
    gcpRegion: 'test-region',
    gcpProjectID: 'test-project-id',
  },
  secrets: {
    credentialsJson: '{}',
  },
  id: 'gemini-1-5-pro-002',
  isPreconfigured: true,
  isSystemAction: false,
  isDeprecated: false,
} as Connector;

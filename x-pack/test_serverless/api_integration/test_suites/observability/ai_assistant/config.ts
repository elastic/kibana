/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../config.base';
import { ObservabilityAIAssistantServices } from './common/ftr_provider_context';
import { services as inheritedServices } from '../../../services';
import { getObservabilityAIAssistantApiClientService } from './common/observability_ai_assistant_api_client';

export const services: ObservabilityAIAssistantServices = {
  ...inheritedServices,
  observabilityAIAssistantAPIClient: getObservabilityAIAssistantApiClientService,
};

export default createTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./tests')],
  junit: {
    reportName: 'Observability AI Assistant API Integration tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },
  services,

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/observability/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.dfa.enabled=false'],
});

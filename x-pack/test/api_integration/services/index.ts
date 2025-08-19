/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { MachineLearningProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ml';
import { IngestManagerProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ingest_manager';
import { UsageAPIProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/usage_api';
import { services as commonServices } from '../../common/services';

export const services = {
  ...commonServices,

  supertest: kibanaApiIntegrationServices.supertest,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
};

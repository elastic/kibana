/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { SecuritySolutionApiProvider } from '@kbn/security-solution-test-api-clients/supertest/detections.gen';

export const services = {
  ...platformServices,
  detectionsApi: SecuritySolutionApiProvider,
};

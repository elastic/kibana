/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionApiProvider as ExceptionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/exceptions.gen';
import { services as platformServices } from '@kbn/test-suites-xpack-platform/api_integration/services';
// @ts-ignore not ts yet
import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';

export const services = {
  ...platformServices,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  exceptionsApi: ExceptionsApiProvider,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BsearchSecureService } from '@kbn/test-suites-serverless/shared/services/bsearch_secure';
import { services as serverlessServices } from '@kbn/test-suites-serverless/api_integration/services';
import { SpacesServiceProvider } from '../../../common/services/spaces';
import { SecuritySolutionServerlessUtils } from '../services/security_solution_serverless_utils';
import { SecuritySolutionServerlessSuperTest } from '../services/security_solution_serverless_supertest';

export const services = {
  ...serverlessServices,
  spaces: SpacesServiceProvider,
  secureBsearch: BsearchSecureService,
  securitySolutionUtils: SecuritySolutionServerlessUtils,
  supertest: SecuritySolutionServerlessSuperTest,
};

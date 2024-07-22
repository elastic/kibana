/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesServiceProvider } from '../../../common/services/spaces';
import { services as serverlessServices } from '../../../../test_serverless/api_integration/services';
import { SecuritySolutionServerlessUtils } from '../services/security_solution_serverless_utils';
import { SecuritySolutionServerlessSuperTest } from '../services/security_solution_serverless_supertest';
import { SecuritySolutionServerlessBsearchCreator } from '../services/security_solution_serverless_bsearch_creator';
import { SecuritySolutionServerlessBsearchInitializer } from '../services/security_solution_serverless_bsearch_initializer';

export const services = {
  ...serverlessServices,
  spaces: SpacesServiceProvider,
  bsearch: SecuritySolutionServerlessBsearchCreator,
  bsearchInitializer: SecuritySolutionServerlessBsearchInitializer,
  securitySolutionUtils: SecuritySolutionServerlessUtils,
  supertest: SecuritySolutionServerlessSuperTest,
};

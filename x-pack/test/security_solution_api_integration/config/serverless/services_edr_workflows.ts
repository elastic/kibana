/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { SvlCommonApiServiceProvider } from '@kbn/test-suites-serverless/shared/services/svl_common_api';
import { services as essServices } from '../ess/services_edr_workflows';
import { SecuritySolutionServerlessSuperTest } from '../services/security_solution_serverless_supertest';
import { SecuritySolutionServerlessUtils } from '../services/security_solution_serverless_utils';

export const svlServices = {
  ...essServices,
  supertest: SecuritySolutionServerlessSuperTest,
  securitySolutionUtils: SecuritySolutionServerlessUtils,
  svlUserManager: commonFunctionalServices.samlAuth,
  svlCommonApi: SvlCommonApiServiceProvider,
};

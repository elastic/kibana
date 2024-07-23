/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaSupertestWithCertWithoutAuthProvider } from '../../../security_solution_endpoint/services/supertest_with_cert';
import { services as essServices } from '../ess/services_edr_workflows';
import { SecuritySolutionServerlessSuperTest } from '../services/security_solution_serverless_supertest';
import { SecuritySolutionServerlessUtils } from '../services/security_solution_serverless_utils';
import { SvlUserManagerProvider } from '../../../../test_serverless/shared/services/svl_user_manager';
import { SvlCommonApiServiceProvider } from '../../../../test_serverless/shared/services/svl_common_api';
import { SecuritySolutionEdrWorkflowsServerlessSuperTest } from '../services/security_solution_edr_workflows_serverless_supertest';

export const svlServices = {
  ...essServices,
  supertest: SecuritySolutionServerlessSuperTest,
  securitySolutionUtils: SecuritySolutionServerlessUtils,
  svlUserManager: SvlUserManagerProvider,
  svlCommonApi: SvlCommonApiServiceProvider,
  supertestWithoutAuth: KibanaSupertestWithCertWithoutAuthProvider,
  edrWorkflowsSupertest: SecuritySolutionEdrWorkflowsServerlessSuperTest,
};

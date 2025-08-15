/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaEBTServerProvider } from '@kbn/test-suites-src/analytics/services/kibana_ebt';
import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { MachineLearningProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ml';
import { IngestManagerProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ingest_manager';
import { UsageAPIProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/usage_api';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { SpacesServiceProvider } from '../services/spaces_service';
import { SecuritySolutionESSUtils } from '../services/security_solution_ess_utils';
import { SecuritySolutionApiProvider } from '../services/security_solution_api.gen';
import { SecuritySolutionApiProvider as SecuritySolutionExceptionsApiProvider } from '../services/security_solution_exceptions_api.gen';

export const services = {
  ...commonFunctionalServices,
  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,
  // esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
  securitySolutionApi: SecuritySolutionApiProvider,
  securitySolutionExceptionsApi: SecuritySolutionExceptionsApiProvider,

  spaces: SpacesServiceProvider,
  securitySolutionUtils: SecuritySolutionESSUtils,
  kibana_ebt_server: KibanaEBTServerProvider,
};

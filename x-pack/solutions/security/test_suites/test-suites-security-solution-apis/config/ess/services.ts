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
import { SecuritySolutionApiProvider as DetectionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/detections.gen';
import { SecuritySolutionApiProvider as EntityAnalyticsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/entity_analytics.gen';
import { SecuritySolutionApiProvider as ExceptionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/exceptions.gen';
import { SpacesServiceProvider } from '../services/spaces_service';
import { SecuritySolutionESSUtils } from '../services/security_solution_ess_utils';
import { RolesUsersProvider } from '../services/security_solution_edr_workflows_roles_users';

export const services = {
  ...commonFunctionalServices,
  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,
  // esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
  detectionsApi: DetectionsApiProvider,
  entityAnalyticsApi: EntityAnalyticsApiProvider,
  exceptionsApi: ExceptionsApiProvider,

  spaces: SpacesServiceProvider,
  securitySolutionUtils: SecuritySolutionESSUtils,
  kibana_ebt_server: KibanaEBTServerProvider,
  rolesUsersProvider: RolesUsersProvider,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as serverlessServices } from '@kbn/test-suites-xpack-platform/serverless/api_integration/services';
import { KibanaEBTServerProvider } from '@kbn/test-suites-src/analytics/services/kibana_ebt';
import { SecuritySolutionApiProvider as DetectionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/detections.gen';
import { SecuritySolutionApiProvider as EntityAnalyticsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/entity_analytics.gen';
import { SecuritySolutionApiProvider as ExceptionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/exceptions.gen';
import { RolesUsersProvider } from '../services/security_solution_edr_workflows_roles_users';
import { SearchSecureService } from '../services/search_secure';
import { SpacesServiceProvider } from '../services/spaces_service';
import { SecuritySolutionServerlessUtils } from '../services/security_solution_serverless_utils';
import { SecuritySolutionServerlessSuperTest } from '../services/security_solution_serverless_supertest';

export const services = {
  ...serverlessServices,
  spaces: SpacesServiceProvider,
  secureSearch: SearchSecureService,
  securitySolutionUtils: SecuritySolutionServerlessUtils,
  supertest: SecuritySolutionServerlessSuperTest,
  kibana_ebt_server: KibanaEBTServerProvider,
  detectionsApi: DetectionsApiProvider,
  entityAnalyticsApi: EntityAnalyticsApiProvider,
  exceptionsApi: ExceptionsApiProvider,
  rolesUsersProvider: RolesUsersProvider,
};

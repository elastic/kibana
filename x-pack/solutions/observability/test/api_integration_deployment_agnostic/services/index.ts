/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as commonDeploymentAgnosticServices } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services';
import { services as xpackDeploymentAgnosticServices } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { RoleScopedSupertestProvider } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { CustomRoleScopedSupertestProvider } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/custom_role_scoped_supertest';
import type { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { ApmApiProvider } from './apm_api';
import { SloApiProvider } from './slo_api';
import { SynthtraceProvider } from './synthtrace';
import { ObservabilityAIAssistantApiProvider } from './observability_ai_assistant_api';

// Re-export types
export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  // stateful services
  supertest: commonDeploymentAgnosticServices.supertest,
  es: commonDeploymentAgnosticServices.es,
  esDeleteAllIndices: commonDeploymentAgnosticServices.esDeleteAllIndices,
  esArchiver: commonDeploymentAgnosticServices.esArchiver,
  esSupertest: commonDeploymentAgnosticServices.esSupertest,
  indexPatterns: commonDeploymentAgnosticServices.indexPatterns,
  ingestPipelines: commonDeploymentAgnosticServices.ingestPipelines,
  kibanaServer: commonDeploymentAgnosticServices.kibanaServer,
  ml: commonDeploymentAgnosticServices.ml,
  randomness: commonDeploymentAgnosticServices.randomness,
  retry: commonDeploymentAgnosticServices.retry,
  security: commonDeploymentAgnosticServices.security,
  usageAPI: commonDeploymentAgnosticServices.usageAPI,
  spaces: commonDeploymentAgnosticServices.spaces,
  // DA services
  alertingApi: xpackDeploymentAgnosticServices.alertingApi,
  supertestWithoutAuth: commonDeploymentAgnosticServices.supertestWithoutAuth,
  samlAuth: commonDeploymentAgnosticServices.samlAuth,
  dataViewApi: commonDeploymentAgnosticServices.dataViewApi,
  packageApi: commonDeploymentAgnosticServices.packageApi,
  roleScopedSupertest: RoleScopedSupertestProvider,
  customRoleScopedSupertest: CustomRoleScopedSupertestProvider,
  // custom providers (extra services)
  apmApi: ApmApiProvider,
  synthtrace: SynthtraceProvider,
  observabilityAIAssistantApi: ObservabilityAIAssistantApiProvider,
  sloApi: SloApiProvider,
  // add any other required or extra services here
};

export type ObltDeploymentAgnosticCommonServices = typeof services;

// Import and re-export types and providers from canonical modules
export type SupertestWithRoleScopeType = SupertestWithRoleScope;

export {
  SupertestWithRoleScope,
  RoleScopedSupertestProvider,
} from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';

export { CustomRoleScopedSupertestProvider } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/custom_role_scoped_supertest';

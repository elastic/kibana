/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as commonDeploymentAgnosticServices } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { services as xpackDeploymentAgnosticServices } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { ApmApiProvider } from './apm_api';
import { SloApiProvider } from './slo_api';
import { SynthtraceProvider } from './synthtrace';
import { ObservabilityAIAssistantApiProvider } from './observability_ai_assistant_api';

// x-pack/test/api_integration/deployment_agnostic/services/role_scoped_supertest.ts

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...commonDeploymentAgnosticServices,
  ...xpackDeploymentAgnosticServices,
  // create a new deployment-agnostic service and load here
  apmApi: ApmApiProvider,
  synthtrace: SynthtraceProvider,
  observabilityAIAssistantApi: ObservabilityAIAssistantApiProvider,
  sloApi: SloApiProvider,
};

export type DeploymentAgnosticCommonServices = typeof services;
export type SupertestWithRoleScopeType = SupertestWithRoleScope;
export { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
export { CustomRoleScopedSupertestProvider } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/custom_role_scoped_supertest';
export { RoleScopedSupertestProvider } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';

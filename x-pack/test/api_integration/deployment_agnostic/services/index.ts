/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformDeploymentAgnosticServices } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/role_scoped_supertest';
import { SynthtraceProvider } from './synthtrace';
import { ObservabilityAIAssistantApiProvider } from './observability_ai_assistant_api';
import { AlertingApiProvider } from './alerting_api';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...platformDeploymentAgnosticServices,
  // these services are left for compatibility with existing tests in x-pack/test and should not be used in new tests
  alertingApi: AlertingApiProvider,
  synthtrace: SynthtraceProvider,
  observabilityAIAssistantApi: ObservabilityAIAssistantApiProvider,
};

export type SupertestWithRoleScopeType = SupertestWithRoleScope;
export type DeploymentAgnosticCommonServices = typeof services;

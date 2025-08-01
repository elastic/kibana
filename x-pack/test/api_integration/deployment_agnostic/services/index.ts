/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformDeploymentAgnosticServices } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/role_scoped_supertest';
import { AlertingApiProvider } from './alerting_api';
import { SloApiProvider } from './slo_api';
import { SynthtraceProvider } from './synthtrace';
import { ApmApiProvider } from './apm_api';
import { ObservabilityAIAssistantApiProvider } from './observability_ai_assistant_api';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...platformDeploymentAgnosticServices,
  // create a new deployment-agnostic service and load here
  alertingApi: AlertingApiProvider,
  sloApi: SloApiProvider,
  synthtrace: SynthtraceProvider,
  apmApi: ApmApiProvider,
  observabilityAIAssistantApi: ObservabilityAIAssistantApiProvider,
};

export type SupertestWithRoleScopeType = SupertestWithRoleScope;
export type DeploymentAgnosticCommonServices = typeof services;

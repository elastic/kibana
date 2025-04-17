/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { AlertingApiProvider } from './alerting_api';
import { DataViewApiProvider } from './data_view_api';
import { deploymentAgnosticServices } from './deployment_agnostic_services';
import { PackageApiProvider } from './package_api';
import { RoleScopedSupertestProvider, SupertestWithRoleScope } from './role_scoped_supertest';
import { CustomRoleScopedSupertestProvider } from './custom_role_scoped_supertest';
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
  ...deploymentAgnosticServices,
  supertestWithoutAuth: commonFunctionalServices.supertestWithoutAuth,
  samlAuth: commonFunctionalServices.samlAuth,
  alertingApi: AlertingApiProvider,
  dataViewApi: DataViewApiProvider,
  packageApi: PackageApiProvider,
  sloApi: SloApiProvider,
  roleScopedSupertest: RoleScopedSupertestProvider,
  customRoleScopedSupertest: CustomRoleScopedSupertestProvider,
  // create a new deployment-agnostic service and load here
  synthtrace: SynthtraceProvider,
  apmApi: ApmApiProvider,
  observabilityAIAssistantApi: ObservabilityAIAssistantApiProvider,
};

export type SupertestWithRoleScopeType = SupertestWithRoleScope;
export type DeploymentAgnosticCommonServices = typeof services;

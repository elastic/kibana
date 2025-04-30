/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as commonDeploymentAgnosticServices } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services';
import { ApmApiProvider } from './apm_api';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...commonDeploymentAgnosticServices,
  // create a new deployment-agnostic service and load here
  apmApi: ApmApiProvider,
};

export type DeploymentAgnosticCommonServices = typeof services;

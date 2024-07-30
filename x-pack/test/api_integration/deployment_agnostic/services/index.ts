/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { deploymentAgnosticServices } from './deployment_agnostic_services';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...deploymentAgnosticServices,
  supertestWithoutAuth: commonFunctionalServices.supertestWithoutAuth,
  svlUserManager: commonFunctionalServices.samlAuthProvider,
  // create a new deployment-agonstic service and load here
};

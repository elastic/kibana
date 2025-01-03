/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { services as deploymentAgnosticServices } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { SupertestProvider } from './supertest';
import { SvlCommonApiServiceProvider } from './svl_common_api';
import { SvlReportingServiceProvider } from './svl_reporting';
import { DataViewApiProvider } from './data_view_api';
import { PlatformSecurityUtilsProvider } from './platform_security_utils';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

const SupertestWithoutAuthProvider = commonFunctionalServices.supertestWithoutAuth;

export const services = {
  supertest: SupertestProvider,
  supertestWithoutAuth: SupertestWithoutAuthProvider,
  svlCommonApi: SvlCommonApiServiceProvider,
  svlReportingApi: SvlReportingServiceProvider,
  svlUserManager: commonFunctionalServices.samlAuth,
  samlAuth: commonFunctionalServices.samlAuth, // <--temp workaround until we can unify naming
  roleScopedSupertest: deploymentAgnosticServices.roleScopedSupertest,
  dataViewApi: DataViewApiProvider,
  platformSecurityUtils: PlatformSecurityUtilsProvider,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { SupertestProvider } from './supertest';
import { SvlCommonApiServiceProvider } from './svl_common_api';
import { SvlReportingServiceProvider } from './svl_reporting';
import { DataViewApiProvider } from './data_view_api';

export type {
  RoleCredentials,
  SupertestWithoutAuthType,
} from '@kbn/ftr-common-functional-services';
export type { InternalRequestHeader } from './svl_common_api';

export const services = {
  supertest: SupertestProvider,
  supertestWithoutAuth: commonFunctionalServices.supertestWithoutAuth,
  svlCommonApi: SvlCommonApiServiceProvider,
  svlReportingApi: SvlReportingServiceProvider,
  svlUserManager: commonFunctionalServices.samlAuthProvider,
  dataViewApi: DataViewApiProvider,
};

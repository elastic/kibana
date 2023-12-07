/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SvlReportingServiceProvider } from './svl_reporting';
import { SupertestProvider, SupertestWithoutAuthProvider } from './supertest';
import { SvlCommonApiServiceProvider } from './svl_common_api';
import { SvlUserManagerProvider } from './user_manager/svl_user_manager';

export const services = {
  supertest: SupertestProvider,
  supertestWithoutAuth: SupertestWithoutAuthProvider,
  svlCommonApi: SvlCommonApiServiceProvider,
  svlReportingApi: SvlReportingServiceProvider,
  svlUserManager: SvlUserManagerProvider,
};

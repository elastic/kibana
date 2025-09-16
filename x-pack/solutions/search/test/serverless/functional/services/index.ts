/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as svlPlatformServices } from '@kbn/test-suites-xpack-platform/serverless/functional/services';
import { services as platformServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { SvlSearchNavigationServiceProvider } from './svl_search_navigation';

export const services = {
  ...svlPlatformServices,
  // Search Solution serverless FTR services
  svlSearchNavigation: SvlSearchNavigationServiceProvider,
  ml: platformServices.ml,
};

export type {
  SupertestWithRoleScopeType,
  RoleCredentials,
} from '@kbn/test-suites-xpack-platform/serverless/shared/services';

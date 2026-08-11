/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as svlPlatformServices } from '@kbn/test-suites-xpack-platform/serverless/functional/services';
import { services as platformServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { services as platformApiServices } from '@kbn/test-suites-xpack-platform/api_integration/services';
import { SvlObltNavigationServiceProvider } from './svl_oblt_navigation';

export const services = {
  ...svlPlatformServices,
  ml: platformServices.ml,
  // Observability Solution serverless FTR services
  svlObltNavigation: SvlObltNavigationServiceProvider,
  synthtrace: platformApiServices.synthtrace,
};

export type {
  SupertestWithRoleScopeType,
  RoleCredentials,
  InternalRequestHeader,
} from '@kbn/test-suites-xpack-platform/serverless/shared/services';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { services as xpackApiIntegrationServices } from '../../../test/api_integration/services';
import { services as svlSharedServices } from '../../shared/services';

import { SvlCommonApiServiceProvider } from './svl_common_api';
import { AlertingApiProvider } from './alerting_api';

export const services = {
  ...xpackApiIntegrationServices,
  ...svlSharedServices,

  svlCommonApi: SvlCommonApiServiceProvider,
  alertingApi: AlertingApiProvider,
};

export type InheritedFtrProviderContext = GenericFtrProviderContext<typeof services, {}>;

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

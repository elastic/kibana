/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { services as deploymentAgnosticSharedServices } from '../../shared/services/deployment_agnostic_services';
import { services as svlSharedServices } from '../../shared/services';

import { AlertingApiProvider } from './alerting_api';
import { SamlToolsProvider } from './saml_tools';
import { DataViewApiProvider } from './data_view_api';
import { SvlCasesServiceProvider } from './svl_cases';
import { SloApiProvider } from './slo_api';

export const services = {
  // deployment agnostic FTR services
  ...deploymentAgnosticSharedServices,

  // serverless FTR services
  ...svlSharedServices,
  alertingApi: AlertingApiProvider,
  samlTools: SamlToolsProvider,
  dataViewApi: DataViewApiProvider,
  svlCases: SvlCasesServiceProvider,
  sloApi: SloApiProvider,
};

export type InheritedFtrProviderContext = GenericFtrProviderContext<typeof services, {}>;

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

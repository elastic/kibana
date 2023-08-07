/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createUsageServices } from '../test_suites/reporting/services/usage';
import { createScenarios } from '../test_suites/reporting/services/scenarios';
import { FtrProviderContext } from '../ftr_provider_context';
import { services as apiIntegrationServices } from '../services'

export function ReportingApiProvider(context: FtrProviderContext) {
  return {
    ...createScenarios(context),
    ...createUsageServices(context),
  };
}

export const services = {
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
  usageAPI: apiIntegrationServices.usageAPI,
  reportingAPI: ReportingApiProvider,
};

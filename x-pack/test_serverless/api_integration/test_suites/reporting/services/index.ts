/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { services as svlServices } from '../../../services';
import { createUsageServices } from './usage';
import { createScenarios } from './scenarios';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { services as apiIntegrationServices } from '.';

export function ReportingAPIProvider(context: FtrProviderContext) {
  return {
    ...createScenarios(context),
    ...createUsageServices(context),
  };
}

export const services = {
  ...svlServices,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
  usageAPI: apiIntegrationServices.usageAPI,
  reportingAPI: ReportingAPIProvider,
};

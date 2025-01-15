/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as apiServices } from '../../reporting_api_integration/services';
import { FtrProviderContext } from '../ftr_provider_context';
import { createScenarios } from './scenarios';

export function ReportingFunctionalProvider(context: FtrProviderContext) {
  return createScenarios(context);
}

export const services = {
  ...apiServices,
  reportingFunctional: ReportingFunctionalProvider,
};

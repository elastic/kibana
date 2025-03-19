/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationComponentDescriptor, IntegrationType } from '@kbn/wci-common';
import { SalesforceTool } from './tool';
import { SalesforceConfigurationForm } from './configuration';
import { SalesforceConfiguration } from '../../common/types';

export function getSalesforceIntegrationComponents(): IntegrationComponentDescriptor<SalesforceConfiguration> {
  return {
    getType: () => IntegrationType.salesforce,
    getTool: () => SalesforceTool,
    getConfigurationForm: () => SalesforceConfigurationForm,
  };
}

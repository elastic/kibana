/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationComponentDescriptor, IntegrationType } from '@kbn/wci-common';
import { ExternalServerTool } from './tool';
import { ExternalServerConfigurationForm } from './configuration';
import { WCIExternalServerConfiguration } from '../../common/types';

export function getExternalServerIntegrationComponents(): IntegrationComponentDescriptor<WCIExternalServerConfiguration> {
  return {
    getType: () => IntegrationType.external_server,
    getTool: () => ExternalServerTool,
    getConfigurationForm: () => ExternalServerConfigurationForm,
  };
}

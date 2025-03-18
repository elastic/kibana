/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexSourceTool } from './tool';
import { IntegrationType } from '@kbn/wci-common';
import { IndexSourceConfigurationForm } from './configuration';
import { IntegrationComponentDescriptor } from '@kbn/wci-common/src/types';
import { WCIIndexSourceConfiguration } from '../../common/types';

export function indexSourceIntegrationComponents(): IntegrationComponentDescriptor<WCIIndexSourceConfiguration> {
  return {
    getType: () => IntegrationType.index_source,
    getTool: () => IndexSourceTool,
    getConfigurationForm: () => IndexSourceConfigurationForm,
  };
}

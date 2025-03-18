/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationConfiguration, IntegrationType } from '@kbn/wci-common';

export interface Integration {
  id: string;
  type: IntegrationType;
  description: string;
  configuration: IntegrationConfiguration;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface IntegrationCreateRequest {
  id?: string;
  type: string;
  description: string;
  configuration: IntegrationConfiguration;
}

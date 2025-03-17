/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Integration, IntegrationConfiguration } from '@kbn/wci-common';

export type IntegrationType = string;

export interface ListIntegrationsPayload {}

export interface ListIntegrationsResponse {
  integrations: Integration[];
}

export interface CreateIntegrationPayload {
  type: IntegrationType;
  name: string;
  configuration: IntegrationConfiguration;
}

export type CreateIntegrationResponse = Integration;

export interface UpdateIntegrationPayload {
  name?: string;
  configuration: IntegrationConfiguration;
}

export type UpdateIntegrationResponse = Integration;

export type GetIntegrationResponse = Integration;

export interface DeleteIntegrationResponse {
  success: boolean;
}

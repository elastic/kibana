/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConnectorFilterOptionData {
  description?: string;
  deleted?: boolean;
}

export interface SettingsOverrideOptions {
  overrideConnectorId?: string;
  overrideEnd?: string;
  overrideFilter?: Record<string, unknown>;
  overrideSize?: number;
  overrideStart?: string;
}

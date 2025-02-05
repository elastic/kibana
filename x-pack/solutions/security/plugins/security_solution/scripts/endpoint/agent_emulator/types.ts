/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AgentEmulatorSettings {
  /** Version of the settings. Can be used in the future if we need to do settings migration */
  version: number;
  endpointLoader: LoadEndpointsConfig;
}

export interface LoadEndpointsConfig {
  count: number;
}

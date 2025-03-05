/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { IntegrationPlugin, IntegrationTypes } from '@kbn/wci-common';

export interface SalesforceIntegrationPlugin extends IntegrationPlugin {
  name: IntegrationTypes.Salesforce;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginStart {
  integration: SalesforceIntegrationPlugin;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginSetupDependencies {}

export interface WCISalesforcePluginStartDependencies {
  inference: InferenceServerStart;
}

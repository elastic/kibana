/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationConfiguration } from '@kbn/wci-common';
import type { WorkChatAppPluginSetup } from '@kbn/workchat-app/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCIIndexSoucePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCIIndexSoucePluginStart {}

export interface WCIIndexSoucePluginSetupDependencies {
  workchatApp: WorkChatAppPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCIIndexSoucePluginStartDependencies {}

export interface WCIIndexSourceConfiguration extends IntegrationConfiguration {
  index: string;
  description: string;
  fields: {
    filterFields: WCIIndexSourceFilterField[];
    contextFields: WCIIndexSourceContextField[];
  };
  queryTemplate: string;
};

export interface WCIIndexSourceFilterField {
  field: string;
  type: string;
  getValues: boolean;
  description: string;
}

export interface WCIIndexSourceContextField {
  field: string;
  description: string;
  type?: 'semantic';
}

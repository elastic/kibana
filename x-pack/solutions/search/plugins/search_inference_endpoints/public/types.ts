/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginSetup, ConsolePluginStart } from '@kbn/console-plugin/public';
import { HttpStart } from '@kbn/core-http-browser';
import { AppMountParameters } from '@kbn/core/public';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import React from 'react';

import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { App } from './components/app';
import type { InferenceEndpointsProvider } from './providers/inference_endpoints_provider';

export * from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginSetup {}
export interface SearchInferenceEndpointsPluginStart {
  InferenceEdnpointsProvider: React.FC<React.ComponentProps<typeof InferenceEndpointsProvider>>;
  InferenceEndpoints: React.FC<React.ComponentProps<typeof App>>;
}

export interface AppPluginStartDependencies {
  history: AppMountParameters['history'];
  share: SharePluginStart;
  console?: ConsolePluginStart;
  serverless?: ServerlessPluginStart;
}

export interface AppPluginSetupDependencies {
  history: AppMountParameters['history'];
  share: SharePluginSetup;
  console?: ConsolePluginSetup;
}

export interface AppServicesContext {
  http: HttpStart;
  ml?: MlPluginStart;
  console?: ConsolePluginStart;
  serverless?: ServerlessPluginStart;
  share: SharePluginStart;
}

export interface InferenceUsageResponse {
  acknowledge: boolean;
  error_message: string;
  indexes: string[];
  pipelines: string[];
}

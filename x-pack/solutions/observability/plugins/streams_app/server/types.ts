/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StreamsPluginStart, StreamsPluginSetup } from '@kbn/streams-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface StreamsAppSetupDependencies {
  streams: StreamsPluginSetup;
}

export interface StreamsAppStartDependencies {
  streams: StreamsPluginStart;
}

export interface StreamsAppServerSetup {}

export interface StreamsAppServerStart {}

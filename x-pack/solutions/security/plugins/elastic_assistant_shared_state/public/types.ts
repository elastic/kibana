/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ElasticAssistantSharedStatePublicPluginSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ElasticAssistantSharedStatePublicPluginStartDependencies {}

export type StartServices = CoreStart & ElasticAssistantSharedStatePublicPluginStartDependencies;

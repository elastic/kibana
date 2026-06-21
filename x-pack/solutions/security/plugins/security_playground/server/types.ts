/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';

export type SecurityPlaygroundSetupPlugins = Record<string, never>;

export interface SecurityPlaygroundStartPlugins {
  spaces: SpacesPluginStart;
  alerting: AlertingServerStart;
}

export type SecurityPlaygroundSetupContract = void;
export type SecurityPlaygroundStartContract = void;

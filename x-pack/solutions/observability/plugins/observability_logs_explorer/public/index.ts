/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { ObservabilityLogsExplorerConfig } from '../common';
import { ObservabilityLogsExplorerPlugin } from './plugin';

export function plugin(context: PluginInitializerContext<ObservabilityLogsExplorerConfig>) {
  return new ObservabilityLogsExplorerPlugin(context);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { SignalInvestigationConfig } from '../common/config';
import { configSchema } from '../common/config';

export const config: PluginConfigDescriptor<SignalInvestigationConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    chartAction: true,
  },
};

export const plugin = async (ctx: PluginInitializerContext<SignalInvestigationConfig>) => {
  const { SignalInvestigationPlugin } = await import('./plugin');
  return new SignalInvestigationPlugin(ctx);
};

export type { SignalInvestigationServerSetup, SignalInvestigationServerStart } from './plugin';

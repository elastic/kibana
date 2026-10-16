/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ConfigSchema } from './config';

export const config: PluginConfigDescriptor = {
  schema: ConfigSchema,
};

export const plugin = async (ctx: PluginInitializerContext) => {
  const { SignificantEventsPlugin } = await import('./plugin');
  return new SignificantEventsPlugin(ctx);
};

export type { AcceptedQuery } from './agent_builder/skills/ki_query_generation';
export type { SignificantEventsRouteRepository } from './routes';
export type { SignificantEventsScopedServices, SignificantEventsServerStart } from './types';
export type { KnowledgeIndicatorClient } from './lib/knowledge_indicators/knowledge_indicator_client';
export type { RuleEventsClient } from './lib/significant_events/events/rule_events_client';
export type { ModelPrice, PriceResult } from './lib/cost/price_service';
export { KNOWLEDGE_INDICATORS_DATA_STREAM } from './lib/knowledge_indicators/data_stream';

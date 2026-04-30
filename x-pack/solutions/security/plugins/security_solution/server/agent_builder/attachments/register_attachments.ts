/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentContextLayerPluginSetup } from '@kbn/agent-context-layer-plugin/server';
import { createRuleAttachmentType } from './rule';
import { createAlertAttachmentType } from './alert';
import { createEntityAttachmentType } from './entity';
import { createEntityAnalyticsDashboardAttachmentType } from './entity_analytics_dashboard';

/**
 * Registers all security agent builder attachments with the agentContextLayer plugin
 */
export const registerAttachments = async (agentContextLayer: AgentContextLayerPluginSetup) => {
  agentContextLayer.registerResolverType(createAlertAttachmentType());
  agentContextLayer.registerResolverType(createEntityAttachmentType());
  agentContextLayer.registerResolverType(createEntityAnalyticsDashboardAttachmentType());
  agentContextLayer.registerResolverType(createRuleAttachmentType());
};

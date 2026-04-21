/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { createRuleAttachmentType } from './rule';
import { createAlertAttachmentType } from './alert';
import { createEntityAttachmentType } from './entity';
import { createEntityCardAttachmentType } from './entity_card';
import { createEntityListAttachmentType } from './entity_list';
import { createEntityAnalyticsDashboardAttachmentType } from './entity_analytics_dashboard';

/**
 * Registers all security agent builder attachments with the agentBuilder plugin
 */
export const registerAttachments = async (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.attachments.registerType(createAlertAttachmentType());
  agentBuilder.attachments.registerType(createEntityAttachmentType());
  agentBuilder.attachments.registerType(createEntityCardAttachmentType());
  agentBuilder.attachments.registerType(createEntityListAttachmentType());
  agentBuilder.attachments.registerType(createEntityAnalyticsDashboardAttachmentType());
  agentBuilder.attachments.registerType(createRuleAttachmentType());
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createRuleAttachmentType } from './rule';
import { createAlertAttachmentType } from './alert';
import { createEntityAttachmentType } from './entity';
import { createEntityAnalyticsDashboardAttachmentType } from './entity_analytics_dashboard';
import { ALL_ATTACHMENT_TYPES as THREAT_INTELLIGENCE_ATTACHMENT_TYPES } from './threat_intelligence_attachment_types';

/**
 * Registers all security agent builder attachments with the agentBuilder plugin
 */
export const registerAttachments = async (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.attachments.registerType(createAlertAttachmentType());
  agentBuilder.attachments.registerType(createEntityAttachmentType());
  agentBuilder.attachments.registerType(createEntityAnalyticsDashboardAttachmentType());
  agentBuilder.attachments.registerType(createRuleAttachmentType());

  // Threat-intelligence attachment types (folded in from the standalone
  // threat-intelligence plugin). Registered unconditionally — only the
  // threat-intelligence tools (gated by `threatIntelligenceSkillEnabled`)
  // emit attachments of these types, so registering them when the skill is
  // off is dead weight but harmless. Matches the existing pattern where
  // attachment types are declarative and never feature-gated here.
  for (const attachmentType of THREAT_INTELLIGENCE_ATTACHMENT_TYPES) {
    agentBuilder.attachments.registerType(
      attachmentType as Parameters<typeof agentBuilder.attachments.registerType>[0]
    );
  }
};

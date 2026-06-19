/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { createRuleAttachmentType } from './rule';
import { createAlertAttachmentType } from './alert';
import { createBulkAlertsAttachmentType } from './alerts';
import { createEntityAttachmentType } from './entity';
import { createEntityAnalyticsDashboardAttachmentType } from './entity_analytics_dashboard';
import { createSiemReadinessAttachmentType } from './siem_readiness';

/**
 * Registers all security agent builder attachments with the agentBuilder plugin
 */
export const registerAttachments = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
) => {
  agentBuilder.attachments.registerType(createAlertAttachmentType());
  agentBuilder.attachments.registerType(createBulkAlertsAttachmentType(core, logger));
  agentBuilder.attachments.registerType(createEntityAttachmentType());
  agentBuilder.attachments.registerType(createEntityAnalyticsDashboardAttachmentType());
  agentBuilder.attachments.registerType(
    createRuleAttachmentType({ getStartServices: core.getStartServices })
  );
  agentBuilder.attachments.registerType(createSiemReadinessAttachmentType());
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { ExperimentalFeatures } from '../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { createRuleAttachmentType } from './rule';
import { createEntityAnalyticsAiBriefAttachmentType } from './entity_analytics_ai_brief';
import { registerPodAttachments } from './register_pod_attachments';
import { createRuleMigrationItemsAttachmentType } from './rule_migration_items';

/**
 * Registers all security agent builder attachments with the agentBuilder plugin.
 *
 * The `security.rule.preview` attachment is gated behind
 * `experimentalFeatures.rulePreviewAttachmentEnabled` so it stays dark until explicitly enabled
 * per environment.
 */
export const registerAttachments = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  kibanaVersion: string,
  ml?: MlPluginSetup
) => {
  registerPodAttachments({ agentBuilder, core, logger, experimentalFeatures });
  agentBuilder.attachments.registerType(
    createEntityAnalyticsAiBriefAttachmentType({
      core,
      logger,
      experimentalFeatures,
      kibanaVersion,
      ml,
    })
  );
  agentBuilder.attachments.registerType(createRuleAttachmentType(core, logger));
  if (
    !experimentalFeatures.siemMigrationsDisabled &&
    experimentalFeatures.siemRuleMigrationsAgentBuilderEnabled
  ) {
    agentBuilder.attachments.registerType(createRuleMigrationItemsAttachmentType());
  }
};

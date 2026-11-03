/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { SIEM_READINESS_AGENT_BUILDER_ENABLED } from '../siem_readiness_feature_flag';
import { createAlertAttachmentType } from './alert';
import { createBulkAlertsAttachmentType } from './alerts';
import { createEntityAttachmentType } from './entity';
import { createEntityAnalyticsDashboardAttachmentType } from './entity_analytics_dashboard';
import { createEntityGraphAttachmentType } from './entity_graph';
import { createEntityRiskScoreHistoryAttachmentType } from './entity_risk_score_history';
import { createExceptionAttachmentType } from './exception';
import { createInvestigationIocsAttachmentType } from './investigation_iocs';
import { createInvestigationTimelineAttachmentType } from './investigation_timeline';
import { createRulePreviewAttachmentType, getRulePreviewAlertCount } from './rule_preview';
import { createSiemReadinessAttachmentType } from './siem_readiness';

/**
 * The security attachment types that only need Elasticsearch (or nothing) from the runtime: Kibana
 * (`registerAttachments`) and task pods (`server/tasks`) register the same ones. The attachment
 * types that need other plugins (rules via alerting, the AI brief via ML and entity store, rule
 * migrations) are registered by `registerAttachments` alone.
 */
export const registerPodAttachments = ({
  agentBuilder,
  core,
  logger,
  experimentalFeatures,
}: {
  agentBuilder: Pick<AgentBuilderPluginSetup, 'attachments'>;
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
}): void => {
  agentBuilder.attachments.registerType(createAlertAttachmentType());
  agentBuilder.attachments.registerType(createBulkAlertsAttachmentType(core, logger));
  agentBuilder.attachments.registerType(createEntityAttachmentType());
  agentBuilder.attachments.registerType(createEntityAnalyticsDashboardAttachmentType());
  agentBuilder.attachments.registerType(createEntityGraphAttachmentType());
  if (experimentalFeatures.riskScoreHistoryEnabled) {
    agentBuilder.attachments.registerType(createEntityRiskScoreHistoryAttachmentType());
  }
  agentBuilder.attachments.registerType(createExceptionAttachmentType());
  if (experimentalFeatures.endpointForensicAnalysisSkill) {
    agentBuilder.attachments.registerType(createInvestigationTimelineAttachmentType());
    agentBuilder.attachments.registerType(createInvestigationIocsAttachmentType());
  }
  if (SIEM_READINESS_AGENT_BUILDER_ENABLED) {
    agentBuilder.attachments.registerType(createSiemReadinessAttachmentType());
  }

  if (experimentalFeatures.rulePreviewAttachmentEnabled) {
    agentBuilder.attachments.registerType(
      createRulePreviewAttachmentType({
        getAlertCount: async ({ previewId, request, spaceId }) => {
          const [coreStart] = await core.getStartServices();

          return getRulePreviewAlertCount({
            esClient: coreStart.elasticsearch.client.asScoped(request, {
              projectRouting: 'space',
            }).asCurrentUser,
            previewId,
            spaceId,
          });
        },
      })
    );
  }
};

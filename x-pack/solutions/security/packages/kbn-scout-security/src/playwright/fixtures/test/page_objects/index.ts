/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage, ScoutTestConfig } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { AlertsTablePage } from './alerts_table';
import { AgentBuilderPage } from './agent_builder';
import { AlertDetailsRightPanelPage } from './alert_details_right_panel';
import { EntityAnalyticsDashboardsPage } from './entity_analytics_dashboards';
import { EntityAnalyticsManagementPage } from './entity_analytics_management';
import { CspmIntegrationPage } from './cspm_integration_page';
import { TimelinePage } from './timeline';
import { DetectionsAttackDiscoveryPage } from './detections_attack_discovery';
import { ThreatMatchRuleCreatePage } from './threat_match_rule_create_page';
import { AttackDetailsRightPanelPage } from './attack_details_right_panel';
import { ServerlessProjectChromePage } from './serverless_project_chrome_page';
import { DocumentFlyoutV2 } from './document_flyout_v2';
import { ThreatIntelligenceToolPage } from './threat_intelligence_tool';
import { CorrelationsToolPage } from './correlations_tool';
import { PrevalenceToolPage } from './prevalence_tool';
import { AnalyzerToolPage } from './analyzer_tool';

export type { ThreatMatchRuleCreatePage } from './threat_match_rule_create_page';

export interface SecurityPageObjects extends PageObjects {
  alertsTablePage: AlertsTablePage;
  agentBuilderPage: AgentBuilderPage;
  alertDetailsRightPanelPage: AlertDetailsRightPanelPage;
  entityAnalyticsDashboardsPage: EntityAnalyticsDashboardsPage;
  entityAnalyticsManagementPage: EntityAnalyticsManagementPage;
  cspmIntegrationPage: CspmIntegrationPage;
  timelinePage: TimelinePage;
  detectionsAttackDiscoveryPage: DetectionsAttackDiscoveryPage;
  /** Indicator match (threat match) rule creation page — threat index and field mapping controls. */
  threatMatchRuleCreatePage: ThreatMatchRuleCreatePage;
  attackDetailsRightPanelPage: AttackDetailsRightPanelPage;
  serverlessProjectChromePage: ServerlessProjectChromePage;
  /** v2 document flyout (alert / event) — requires `newFlyoutSystemEnabled` experimental feature. */
  documentFlyoutV2: DocumentFlyoutV2;
  /** Threat intelligence tool overlay inside the flyout v2 document flyout. */
  threatIntelligenceTool: ThreatIntelligenceToolPage;
  /** Correlations tool overlay inside the flyout v2 document flyout. */
  correlationsTool: CorrelationsToolPage;
  /** Prevalence tool overlay inside the flyout v2 document flyout. */
  prevalenceTool: PrevalenceToolPage;
  /** Analyzer tool overlay (resolver process-tree graph) inside the flyout v2 document flyout. */
  analyzerTool: AnalyzerToolPage;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage,
  config: ScoutTestConfig
): SecurityPageObjects {
  return {
    ...pageObjects,
    alertsTablePage: createLazyPageObject(AlertsTablePage, page),
    agentBuilderPage: createLazyPageObject(AgentBuilderPage, page),
    alertDetailsRightPanelPage: createLazyPageObject(AlertDetailsRightPanelPage, page),
    entityAnalyticsDashboardsPage: createLazyPageObject(EntityAnalyticsDashboardsPage, page),
    entityAnalyticsManagementPage: createLazyPageObject(EntityAnalyticsManagementPage, page),
    cspmIntegrationPage: createLazyPageObject(CspmIntegrationPage, page),
    timelinePage: createLazyPageObject(TimelinePage, page),
    detectionsAttackDiscoveryPage: createLazyPageObject(
      DetectionsAttackDiscoveryPage,
      page,
      config
    ),
    threatMatchRuleCreatePage: createLazyPageObject(ThreatMatchRuleCreatePage, page),
    attackDetailsRightPanelPage: createLazyPageObject(AttackDetailsRightPanelPage, page),
    serverlessProjectChromePage: createLazyPageObject(ServerlessProjectChromePage, page),
    documentFlyoutV2: createLazyPageObject(DocumentFlyoutV2, page),
    threatIntelligenceTool: createLazyPageObject(ThreatIntelligenceToolPage, page),
    correlationsTool: createLazyPageObject(CorrelationsToolPage, page),
    prevalenceTool: createLazyPageObject(PrevalenceToolPage, page),
    analyzerTool: createLazyPageObject(AnalyzerToolPage, page),
  };
}

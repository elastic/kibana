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
import { GraphFlyoutPage } from './graph_flyout_page';
import { DocumentFlyout } from './flyout_v2/document/main/document_flyout';
import { RuleFlyout } from './flyout_v2/rule/rule_flyout';
import { NetworkFlyout } from './flyout_v2/network/network_flyout';
import { ThreatIntelligenceTool } from './flyout_v2/document/tools/threat_intelligence_tool';
import { CorrelationsTool } from './flyout_v2/document/tools/correlations_tool';
import { PrevalenceTool } from './flyout_v2/document/tools/prevalence_tool';
import { AnalyzerTool } from './flyout_v2/document/tools/analyzer_tool';
import { NotesTool } from './flyout_v2/document/tools/notes_tool';
import { ResponseTool } from './flyout_v2/document/tools/response_tool';

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
  /** Graph Visualization tab inside the alert/event details left panel. */
  graphFlyoutPage: GraphFlyoutPage;
  /** v2 document flyout (alert / event) — requires `newFlyoutSystemEnabled` experimental feature. */
  documentFlyout: DocumentFlyout;
  /** v2 rule flyout — opened from the alerts table rule column or the document flyout About section. */
  ruleFlyout: RuleFlyout;
  /** v2 network flyout — opened from an IP value (alerts table source.ip cell / document flyout IP field). */
  networkFlyout: NetworkFlyout;
  /** Threat intelligence tool overlay inside the flyout v2 document flyout. */
  threatIntelligenceTool: ThreatIntelligenceTool;
  /** Correlations tool overlay inside the flyout v2 document flyout. */
  correlationsTool: CorrelationsTool;
  /** Prevalence tool overlay inside the flyout v2 document flyout. */
  prevalenceTool: PrevalenceTool;
  /** Analyzer tool overlay (resolver process-tree graph) inside the flyout v2 document flyout. */
  analyzerTool: AnalyzerTool;
  /** Notes tool overlay inside the flyout v2 document flyout. */
  notesTool: NotesTool;
  /** Response tool overlay (automated response actions) inside the flyout v2 document flyout. */
  responseTool: ResponseTool;
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
    graphFlyoutPage: createLazyPageObject(GraphFlyoutPage, page),
    documentFlyout: createLazyPageObject(DocumentFlyout, page),
    ruleFlyout: createLazyPageObject(RuleFlyout, page),
    networkFlyout: createLazyPageObject(NetworkFlyout, page),
    threatIntelligenceTool: createLazyPageObject(ThreatIntelligenceTool, page),
    correlationsTool: createLazyPageObject(CorrelationsTool, page),
    prevalenceTool: createLazyPageObject(PrevalenceTool, page),
    analyzerTool: createLazyPageObject(AnalyzerTool, page),
    notesTool: createLazyPageObject(NotesTool, page),
    responseTool: createLazyPageObject(ResponseTool, page),
  };
}

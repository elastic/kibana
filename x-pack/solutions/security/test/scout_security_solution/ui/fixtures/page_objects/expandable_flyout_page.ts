/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class ExpandableFlyoutPage {
  readonly page: ScoutPage;

  /* Flyout body */
  readonly flyoutBody: Locator;
  readonly closeButton: Locator;

  /* Header */
  readonly headerIcon: Locator;
  readonly headerTitle: Locator;
  readonly headerLinkIcon: Locator;
  readonly headerStatus: Locator;
  readonly headerRiskScoreTitle: Locator;
  readonly headerRiskScoreValue: Locator;
  readonly headerSeverityValue: Locator;
  readonly headerAssigneesTitle: Locator;
  readonly headerAssigneesValue: Locator;
  readonly headerNotesTitle: Locator;
  readonly headerNotesAddButton: Locator;

  /* Right panel tabs */
  readonly overviewTab: Locator;
  readonly tableTab: Locator;
  readonly jsonTab: Locator;

  /* Expand / Collapse */
  readonly expandDetailsButton: Locator;
  readonly collapseDetailsButton: Locator;

  /* Footer */
  readonly footer: Locator;
  readonly takeActionButton: Locator;
  readonly takeActionDropdown: Locator;
  readonly addToNewCaseAction: Locator;
  readonly addToExistingCaseAction: Locator;
  readonly markAsAcknowledgedAction: Locator;
  readonly markAsClosedAction: Locator;
  readonly addEndpointExceptionAction: Locator;
  readonly addRuleExceptionAction: Locator;
  readonly isolateHostAction: Locator;
  readonly respondAction: Locator;
  readonly investigateInTimelineAction: Locator;

  /* Overview tab – About section */
  readonly aboutSectionHeader: Locator;
  readonly aboutSectionContent: Locator;
  readonly descriptionTitle: Locator;
  readonly descriptionDetails: Locator;
  readonly ruleSummaryButton: Locator;
  readonly reasonTitle: Locator;
  readonly reasonDetails: Locator;
  readonly alertReasonPreviewButton: Locator;
  readonly mitreAttackTitle: Locator;
  readonly mitreAttackDetails: Locator;

  /* Overview tab – Investigation section */
  readonly investigationSectionHeader: Locator;
  readonly highlightedFieldsTitle: Locator;
  readonly highlightedFieldsDetails: Locator;
  readonly investigationGuideButton: Locator;

  /* Overview tab – Insights section */
  readonly insightsSectionHeader: Locator;
  readonly insightsEntitiesHeader: Locator;
  readonly insightsCorrelationsHeader: Locator;
  readonly insightsThreatIntelHeader: Locator;
  readonly insightsPrevalenceHeader: Locator;
  readonly insightsPrevalenceContent: Locator;

  /* Overview tab – Visualizations section */
  readonly visualizationsSectionHeader: Locator;
  readonly analyzerPreviewTitleLink: Locator;
  readonly analyzerPreviewContent: Locator;
  readonly sessionPreviewContent: Locator;

  /* Overview tab – Response section */
  readonly responseSectionHeader: Locator;
  readonly responseButton: Locator;

  /* Table tab */
  readonly tableTabSearchInput: Locator;
  readonly tableTabTimestampRow: Locator;

  /* JSON tab */
  readonly jsonTabCopyButton: Locator;
  readonly jsonTabContent: Locator;

  /* Left panel tabs */
  readonly insightsTab: Locator;
  readonly visualizeTab: Locator;
  readonly investigationTab: Locator;
  readonly responseTab: Locator;

  /* Visualize tab */
  readonly graphAnalyzerButton: Locator;
  readonly graphAnalyzerContent: Locator;
  readonly sessionViewButton: Locator;

  /* Insights > Correlations */
  readonly correlationsButton: Locator;

  /* Insights > Prevalence */
  readonly prevalenceButton: Locator;

  /* Insights > Entities */
  readonly entitiesButton: Locator;

  /* Insights > Threat Intelligence */
  readonly threatIntelligenceButton: Locator;

  /* Investigation tab */
  readonly investigationTabContent: Locator;

  /* Response tab (left panel) */
  readonly responseDetails: Locator;
  readonly responseEmpty: Locator;

  /* Preview panels */
  readonly previewSection: Locator;
  readonly previewBanner: Locator;
  readonly previewBackButton: Locator;
  readonly previewCloseButton: Locator;
  readonly previewFooter: Locator;
  readonly previewFooterLink: Locator;

  /* Alert reason preview */
  readonly alertReasonPreviewBody: Locator;

  /* Rule preview */
  readonly rulePreviewTitle: Locator;
  readonly rulePreviewAboutSectionHeader: Locator;
  readonly rulePreviewAboutSectionContent: Locator;
  readonly rulePreviewDefinitionSectionHeader: Locator;
  readonly rulePreviewDefinitionSectionContent: Locator;
  readonly rulePreviewScheduleSectionHeader: Locator;
  readonly rulePreviewScheduleSectionContent: Locator;
  readonly rulePreviewFooter: Locator;
  readonly rulePreviewFooterLink: Locator;

  /* Settings menu */
  readonly settingsMenuButton: Locator;
  readonly flyoutTypeButtonGroup: Locator;
  readonly overlayOption: Locator;
  readonly pushOption: Locator;

  constructor(page: ScoutPage) {
    this.page = page;

    /* Flyout body */
    this.flyoutBody = page.testSubj.locator('securitySolutionFlyoutBody');
    this.closeButton = page.testSubj.locator('euiFlyoutCloseButton');

    /* Header */
    this.headerIcon = page.testSubj.locator('securitySolutionFlyoutAlertTitleIcon');
    this.headerTitle = page.testSubj.locator('securitySolutionFlyoutAlertTitleText');
    this.headerLinkIcon = page.testSubj.locator('securitySolutionFlyoutAlertTitleLinkIcon');
    this.headerStatus = page.testSubj.locator('rule-status-badge');
    this.headerRiskScoreTitle = page.testSubj.locator('securitySolutionFlyoutHeaderRiskScoreTitle');
    this.headerRiskScoreValue = page.testSubj.locator('securitySolutionFlyoutHeaderRiskScoreValue');
    this.headerSeverityValue = page.testSubj.locator('severity');
    this.headerAssigneesTitle = page.testSubj.locator('securitySolutionFlyoutHeaderAssigneesTitle');
    this.headerAssigneesValue = page.testSubj.locator('securitySolutionFlyoutHeaderAssignees');
    this.headerNotesTitle = page.testSubj.locator('securitySolutionFlyoutHeaderNotesTitle');
    this.headerNotesAddButton = page.testSubj.locator(
      'securitySolutionFlyoutHeaderNotesAddNoteButton'
    );

    /* Right panel tabs */
    this.overviewTab = page.testSubj.locator('securitySolutionFlyoutOverviewTab');
    this.tableTab = page.testSubj.locator('securitySolutionFlyoutTableTab');
    this.jsonTab = page.testSubj.locator('securitySolutionFlyoutJsonTab');

    /* Expand / Collapse */
    this.expandDetailsButton = page.testSubj.locator(
      'securitySolutionFlyoutNavigationExpandDetailButton'
    );
    this.collapseDetailsButton = page.testSubj.locator(
      'securitySolutionFlyoutNavigationCollapseDetailButton'
    );

    /* Footer */
    this.footer = page.testSubj.locator('securitySolutionFlyoutFooter');
    this.takeActionButton = page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton');
    this.takeActionDropdown = page.testSubj.locator('takeActionPanelMenu');
    this.addToNewCaseAction = page.testSubj.locator('add-to-new-case-action');
    this.addToExistingCaseAction = page.testSubj.locator('add-to-existing-case-action');
    this.markAsAcknowledgedAction = page.testSubj.locator('acknowledged-alert-status');
    this.markAsClosedAction = page.testSubj.locator('alert-close-context-menu-item');
    this.addEndpointExceptionAction = page.testSubj.locator('add-endpoint-exception-menu-item');
    this.addRuleExceptionAction = page.testSubj.locator('add-exception-menu-item');
    this.isolateHostAction = page.testSubj.locator('isolate-host-action-item');
    this.respondAction = page.testSubj.locator('endpointResponseActions-action-item');
    this.investigateInTimelineAction = page.testSubj.locator('investigate-in-timeline-action-item');

    /* Overview tab – About */
    this.aboutSectionHeader = page.testSubj.locator('securitySolutionFlyoutAboutSectionHeader');
    this.aboutSectionContent = page.testSubj.locator('securitySolutionFlyoutAboutSectionContent');
    this.descriptionTitle = page.testSubj.locator('securitySolutionFlyoutAlertDescriptionTitle');
    this.descriptionDetails = page.testSubj.locator(
      'securitySolutionFlyoutAlertDescriptionDetails'
    );
    this.ruleSummaryButton = page.testSubj.locator('securitySolutionFlyoutRuleSummaryButton');
    this.reasonTitle = page.testSubj.locator('securitySolutionFlyoutReasonTitle');
    this.reasonDetails = page.testSubj.locator('securitySolutionFlyoutReasonDetails');
    this.alertReasonPreviewButton = page.testSubj.locator(
      'securitySolutionFlyoutReasonPreviewButton'
    );
    this.mitreAttackTitle = page.testSubj.locator('securitySolutionFlyoutMitreAttackTitle');
    this.mitreAttackDetails = page.testSubj.locator('securitySolutionFlyoutMitreAttackDetails');

    /* Overview tab – Investigation */
    this.investigationSectionHeader = page.testSubj.locator(
      'securitySolutionFlyoutInvestigationSectionHeader'
    );
    this.highlightedFieldsTitle = page.testSubj.locator(
      'securitySolutionFlyoutHighlightedFieldsTitle'
    );
    this.highlightedFieldsDetails = page.testSubj.locator(
      'securitySolutionFlyoutHighlightedFieldsDetails'
    );
    this.investigationGuideButton = page.testSubj.locator(
      'securitySolutionFlyoutInvestigationGuideButton'
    );

    /* Overview tab – Insights */
    this.insightsSectionHeader = page.testSubj.locator('securitySolutionFlyoutInsightsHeader');
    this.insightsEntitiesHeader = page.testSubj.locator(
      'securitySolutionFlyoutInsightsEntitiesTitleLink'
    );
    this.insightsCorrelationsHeader = page.testSubj.locator(
      'securitySolutionFlyoutCorrelationsTitleLink'
    );
    this.insightsThreatIntelHeader = page.testSubj.locator(
      'securitySolutionFlyoutInsightsThreatIntelligenceTitleLink'
    );
    this.insightsPrevalenceHeader = page.testSubj.locator(
      'securitySolutionFlyoutInsightsPrevalenceTitleLink'
    );
    this.insightsPrevalenceContent = page.testSubj.locator(
      'securitySolutionFlyoutInsightsPrevalenceContent'
    );

    /* Overview tab – Visualizations */
    this.visualizationsSectionHeader = page.testSubj.locator(
      'securitySolutionFlyoutVisualizationsHeader'
    );
    this.analyzerPreviewTitleLink = page.testSubj.locator(
      'securitySolutionFlyoutAnalyzerPreviewTitleLink'
    );
    this.analyzerPreviewContent = page.testSubj.locator(
      'securitySolutionFlyoutAnalyzerPreviewContent'
    );
    this.sessionPreviewContent = page.testSubj.locator(
      'securitySolutionFlyoutSessionPreviewContent'
    );

    /* Overview tab – Response */
    this.responseSectionHeader = page.testSubj.locator(
      'securitySolutionFlyoutResponseSectionHeader'
    );
    this.responseButton = page.testSubj.locator('securitySolutionFlyoutResponseButton');

    /* Table tab */
    this.tableTabSearchInput = page.testSubj.locator(
      'securitySolutionFlyoutDocumentTableSearchInput'
    );
    this.tableTabTimestampRow = page.testSubj.locator('flyout-table-row-@timestamp');

    /* JSON tab */
    this.jsonTabCopyButton = page.testSubj.locator('securitySolutionFlyoutJsonTabCopyToClipboard');
    this.jsonTabContent = page.testSubj.locator('securitySolutionFlyoutjsonView');

    /* Left panel tabs */
    this.insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
    this.visualizeTab = page.testSubj.locator('securitySolutionFlyoutVisualizeTab');
    this.investigationTab = page.testSubj.locator('securitySolutionFlyoutInvestigationTab');
    this.responseTab = page.testSubj.locator('securitySolutionFlyoutResponseTab');

    /* Visualize > Analyzer Graph */
    this.graphAnalyzerButton = page.testSubj.locator(
      'securitySolutionFlyoutVisualizeTabGraphAnalyzerButton'
    );
    this.graphAnalyzerContent = page.testSubj.locator('securitySolutionFlyoutAnalyzerGraph');

    /* Visualize > Session View */
    this.sessionViewButton = page.testSubj.locator(
      'securitySolutionFlyoutVisualizeTabSessionViewButton'
    );

    /* Insights > Correlations */
    this.correlationsButton = page.testSubj.locator(
      'securitySolutionFlyoutInsightsTabCorrelationsButton'
    );

    /* Insights > Prevalence */
    this.prevalenceButton = page.testSubj.locator(
      'securitySolutionFlyoutInsightsTabPrevalenceButton'
    );

    /* Insights > Entities */
    this.entitiesButton = page.testSubj.locator('securitySolutionFlyoutInsightsTabEntitiesButton');

    /* Insights > Threat Intelligence */
    this.threatIntelligenceButton = page.testSubj.locator(
      'securitySolutionFlyoutInsightsTabThreatIntelligenceButton'
    );

    /* Investigation tab content */
    this.investigationTabContent = page.testSubj.locator(
      'securitySolutionFlyoutInvestigationsTabContent'
    );

    /* Response tab (left panel) */
    this.responseDetails = page.testSubj.locator('securitySolutionFlyoutResponseDetails');
    this.responseEmpty = page.testSubj.locator('securitySolutionFlyoutResponseNoData');

    /* Preview panels */
    this.previewSection = page.testSubj.locator('previewSection');
    this.previewBanner = page.testSubj.locator('previewSectionBannerText');
    this.previewBackButton = page.testSubj.locator('previewSectionBackButton');
    this.previewCloseButton = page.testSubj.locator('previewSectionCloseButton');
    this.previewFooter = page.testSubj.locator('securitySolutionFlyoutPreviewFooter');
    this.previewFooterLink = page.testSubj.locator('securitySolutionFlyoutPreviewFooterLink');

    /* Alert reason preview */
    this.alertReasonPreviewBody = page.testSubj.locator('securitySolutionFlyoutAlertReasonBody');

    /* Rule preview */
    this.rulePreviewTitle = page.testSubj.locator('securitySolutionFlyoutRulePanelTitle');
    this.rulePreviewAboutSectionHeader = page.testSubj.locator(
      'securitySolutionFlyoutRulePanelAboutSectionHeader'
    );
    this.rulePreviewAboutSectionContent = page.testSubj.locator(
      'securitySolutionFlyoutRulePanelAboutSectionContent'
    );
    this.rulePreviewDefinitionSectionHeader = page.testSubj.locator(
      'securitySolutionFlyoutRulePanelDefinitionSectionHeader'
    );
    this.rulePreviewDefinitionSectionContent = page.testSubj.locator(
      'securitySolutionFlyoutRulePanelDefinitionSectionContent'
    );
    this.rulePreviewScheduleSectionHeader = page.testSubj.locator(
      'securitySolutionFlyoutRulePanelScheduleSectionHeader'
    );
    this.rulePreviewScheduleSectionContent = page.testSubj.locator(
      'securitySolutionFlyoutRulePanelScheduleSectionContent'
    );
    this.rulePreviewFooter = page.testSubj.locator('securitySolutionFlyoutRulePreviewPanelFooter');
    this.rulePreviewFooterLink = page.testSubj.locator(
      'securitySolutionFlyoutRulePreviewPanelFooterOpenRuleFlyout'
    );

    /* Settings menu */
    this.settingsMenuButton = page.testSubj.locator('settingsMenuButton');
    this.flyoutTypeButtonGroup = page.testSubj.locator('settingsMenuFlyoutTypeButtonGroup');
    this.overlayOption = page.testSubj.locator('settingsMenuFlyoutTypeButtonGroupOverlayOption');
    this.pushOption = page.testSubj.locator('settingsMenuFlyoutTypeButtonGroupPushOption');
  }

  async expandAlertAtIndex(index: number): Promise<void> {
    const expandButtons = this.page.testSubj.locator('expand-event');
    await expandButtons.nth(index).click();
    await this.flyoutBody.waitFor({ state: 'visible' });
  }

  async closeAlertFlyout(): Promise<void> {
    await this.closeButton.click();
    await this.flyoutBody.waitFor({ state: 'hidden' });
  }

  async openOverviewTab(): Promise<void> {
    await this.overviewTab.click();
  }

  async openTableTab(): Promise<void> {
    await this.tableTab.click();
  }

  async openJsonTab(): Promise<void> {
    await this.jsonTab.click();
  }

  async expandLeftPanel(): Promise<void> {
    await this.expandDetailsButton.click();
  }

  async collapseLeftPanel(): Promise<void> {
    await this.collapseDetailsButton.click();
  }

  async openInsightsTab(): Promise<void> {
    await this.insightsTab.click();
  }

  async openVisualizeTab(): Promise<void> {
    await this.visualizeTab.click();
  }

  async openInvestigationTab(): Promise<void> {
    await this.investigationTab.click();
  }

  async openResponseTab(): Promise<void> {
    await this.responseTab.click();
  }

  async openAnalyzerGraphTab(): Promise<void> {
    await this.openVisualizeTab();
    await this.graphAnalyzerButton.click();
  }

  async openSessionViewTab(): Promise<void> {
    await this.openVisualizeTab();
    await this.sessionViewButton.click();
  }

  async openCorrelationsTab(): Promise<void> {
    await this.openInsightsTab();
    await this.correlationsButton.click();
  }

  async openPrevalenceTab(): Promise<void> {
    await this.openInsightsTab();
    await this.prevalenceButton.click();
  }

  async openEntitiesTab(): Promise<void> {
    await this.openInsightsTab();
    await this.entitiesButton.click();
  }

  async openThreatIntelligenceTab(): Promise<void> {
    await this.openInsightsTab();
    await this.threatIntelligenceButton.click();
  }

  async openTakeActionButton(): Promise<void> {
    await this.takeActionButton.click();
    await this.takeActionDropdown.waitFor({ state: 'visible' });
  }

  async selectTakeActionItem(
    item:
      | 'newCase'
      | 'existingCase'
      | 'acknowledged'
      | 'closed'
      | 'endpointException'
      | 'ruleException'
      | 'isolateHost'
      | 'respond'
      | 'investigateInTimeline'
  ): Promise<void> {
    const actionMap: Record<string, Locator> = {
      newCase: this.addToNewCaseAction,
      existingCase: this.addToExistingCaseAction,
      acknowledged: this.markAsAcknowledgedAction,
      closed: this.markAsClosedAction,
      endpointException: this.addEndpointExceptionAction,
      ruleException: this.addRuleExceptionAction,
      isolateHost: this.isolateHostAction,
      respond: this.respondAction,
      investigateInTimeline: this.investigateInTimelineAction,
    };
    await actionMap[item].click();
  }

  async openAlertReasonPreview(): Promise<void> {
    await this.alertReasonPreviewButton.click();
    await this.previewSection.waitFor({ state: 'visible' });
  }

  async openRulePreview(): Promise<void> {
    await this.ruleSummaryButton.click();
    await this.previewSection.waitFor({ state: 'visible' });
  }

  async closePreview(): Promise<void> {
    await this.previewCloseButton.click();
  }

  async openSettingsMenu(): Promise<void> {
    await this.settingsMenuButton.click();
  }

  async selectOverlayMode(): Promise<void> {
    await this.openSettingsMenu();
    await this.overlayOption.click();
  }

  async selectPushMode(): Promise<void> {
    await this.openSettingsMenu();
    await this.pushOption.click();
  }

  getHighlightedFieldValueCell(value: string): Locator {
    return this.page.testSubj.locator(`${value}-securitySolutionFlyoutHighlightedFieldsCell`);
  }

  getTableRow(fieldName: string): Locator {
    return this.page.testSubj.locator(`flyout-table-row-${fieldName}`);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

/* About section */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER = getDataTestSubjectSelector(
  'securitySolutionFlyoutAboutSectionHeader'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutAboutSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutAlertDescriptionTitle'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_DETAILS = getDataTestSubjectSelector(
  'securitySolutionFlyoutAlertDescriptionDetails'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON =
  getDataTestSubjectSelector('securitySolutionFlyoutRuleSummaryButton');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutReasonTitle'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_DETAILS = getDataTestSubjectSelector(
  'securitySolutionFlyoutReasonDetails'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_ALERT_REASON_PREVIEW_BUTTON =
  getDataTestSubjectSelector('securitySolutionFlyoutReasonPreviewButton');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutMitreAttackTitle'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS = getDataTestSubjectSelector(
  'securitySolutionFlyoutMitreAttackDetails'
);

/* Investigation section */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutInvestigationSectionHeader');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutInvestigationSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE =
  getDataTestSubjectSelector('securitySolutionFlyoutHighlightedFieldsTitle');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS =
  getDataTestSubjectSelector('securitySolutionFlyoutHighlightedFieldsDetails');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL =
  getDataTestSubjectSelector('fieldCell');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL = (
  value: string
) => getDataTestSubjectSelector(`${value}-securitySolutionFlyoutHighlightedFieldsCell`);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON =
  getDataTestSubjectSelector('securitySolutionFlyoutInvestigationGuideButton');

/* Insights section */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutInsightsHeader');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutInsightsContent');

/* Insights Entities */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutInsightsEntitiesTitleLink');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HOST_OVERVIEW_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsEntitiesHostOverviewLink'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_USER_OVERVIEW_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsEntitiesUserOverviewLink'
);

/* Insights Threat Intelligence */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutInsightsThreatIntelligenceTitleLink');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_VALUE =
  getDataTestSubjectSelector('securitySolutionFlyoutInsightsThreatIntelligenceThreatMatchesButton');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_VALUE =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutInsightsThreatIntelligenceEnrichedWithThreatIntelligenceButton'
  );

/* Insights Correlations */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutCorrelationsTitleLink');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_SUPPRESSED_ALERTS =
  getDataTestSubjectSelector('securitySolutionFlyoutCorrelationsSuppressedAlertsButton');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_ANCESTRY =
  getDataTestSubjectSelector('securitySolutionFlyoutCorrelationsRelatedAlertsByAncestryButton');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_SAME_SOURCE_EVENT =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsRelatedAlertsBySameSourceEventButton'
  );
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_SESSION =
  getDataTestSubjectSelector('securitySolutionFlyoutCorrelationsRelatedAlertsBySessionButton');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_CASES =
  getDataTestSubjectSelector('securitySolutionFlyoutCorrelationsRelatedCasesButton');

/* Insights Prevalence */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutInsightsPrevalenceTitleLink');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutInsightsPrevalenceContent');

/* Visualization section */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutVisualizationsHeader');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutVisualizationsContent');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ANALYZER_PREVIEW_TITLE_LINK =
  getDataTestSubjectSelector('securitySolutionFlyoutAnalyzerPreviewTitleLink');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ANALYZER_PREVIEW_CONTAINER =
  getDataTestSubjectSelector('securitySolutionFlyoutAnalyzerPreviewContent');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_SESSION_PREVIEW_CONTAINER =
  getDataTestSubjectSelector('securitySolutionFlyoutSessionPreviewContent');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_SESSION_PREVIEW_NO_DATA =
  getDataTestSubjectSelector('securitySolutionFlyoutSessionViewNoData');

/* Response section */

export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutResponseSectionHeader');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutResponseSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_BUTTON = getDataTestSubjectSelector(
  'securitySolutionFlyoutResponseButton'
);

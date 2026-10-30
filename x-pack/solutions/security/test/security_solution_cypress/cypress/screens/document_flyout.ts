/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

/* Header */

export const DOCUMENT_FLYOUT_HEADER_ASSIGNEES = getDataTestSubjectSelector(
  'securitySolutionFlyoutHeaderAssignees'
);

/* Tabs */

export const DOCUMENT_FLYOUT_TABLE_TAB = getDataTestSubjectSelector(
  'securitySolutionDocumentDetailsFlyoutTableTab'
);
export const DOCUMENT_FLYOUT_TABLE_TAB_SEARCH_INPUT = getDataTestSubjectSelector(
  'securitySolutionFlyoutDocumentTableSearchInput'
);
export const DOCUMENT_FLYOUT_TABLE_TAB_THREAT_ENRICHMENTS_ROW = getDataTestSubjectSelector(
  'flyout-table-row-threat.enrichments'
);

/* Overview tab sections */

export const DOCUMENT_FLYOUT_VISUALIZATIONS_SECTION_HEADER = getDataTestSubjectSelector(
  'securitySolutionFlyoutVisualizationsHeader'
);
export const DOCUMENT_FLYOUT_ANALYZER_PREVIEW_TITLE_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutAnalyzerPreviewTitleLink'
);
export const DOCUMENT_FLYOUT_CORRELATIONS_TITLE_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsTitleLink'
);
export const DOCUMENT_FLYOUT_PREVALENCE_TITLE_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsPrevalenceTitleLink'
);
export const DOCUMENT_FLYOUT_THREAT_INTELLIGENCE_TITLE_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsThreatIntelligenceTitleLink'
);

/* Footer */

export const DOCUMENT_FLYOUT_TAKE_ACTION_BUTTON = getDataTestSubjectSelector(
  'securitySolutionFlyoutFooterDropdownButton'
);
export const DOCUMENT_FLYOUT_TAKE_ACTION_MENU = getDataTestSubjectSelector('takeActionPanelMenu');
export const DOCUMENT_FLYOUT_TAKE_ACTION_INVESTIGATE_IN_TIMELINE = getDataTestSubjectSelector(
  'investigate-in-timeline-action-item'
);

/* Tools */

export const DOCUMENT_FLYOUT_ANALYZER_GRAPH = getDataTestSubjectSelector(
  'securitySolutionFlyoutAnalyzerGraph'
);
export const DOCUMENT_FLYOUT_SESSION_VIEW = getDataTestSubjectSelector(
  'securitySolutionFlyoutSessionView'
);
export const DOCUMENT_FLYOUT_PREVALENCE_INVESTIGATE_IN_TIMELINE = getDataTestSubjectSelector(
  'securitySolutionFlyoutPrevalenceDetailsTableInvestigateInTimelineButton'
);
export const DOCUMENT_FLYOUT_CORRELATIONS_SOURCE_INVESTIGATE_IN_TIMELINE =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsDetailsAlertsBySourceSectionInvestigateInTimeline'
  );
export const DOCUMENT_FLYOUT_CORRELATIONS_SESSION_INVESTIGATE_IN_TIMELINE =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsDetailsAlertsBySessionSectionInvestigateInTimeline'
  );
export const DOCUMENT_FLYOUT_CORRELATIONS_ANCESTRY_INVESTIGATE_IN_TIMELINE =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsDetailsAlertsByAncestrySectionInvestigateInTimeline'
  );

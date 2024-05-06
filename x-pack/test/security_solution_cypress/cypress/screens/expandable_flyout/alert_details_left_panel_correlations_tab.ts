/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsTabCorrelationsButton'
);

export const CORRELATIONS_ANCESTRY_SECTION_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsAlertsByAncestrySectionTitleText'
);

export const CORRELATIONS_ANCESTRY_SECTION_TABLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsAlertsByAncestrySectionTable'
);

export const CORRELATIONS_ANCESTRY_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsDetailsAlertsByAncestrySectionInvestigateInTimeline'
  );

export const CORRELATIONS_SOURCE_SECTION_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsAlertsBySourceSectionTitleText'
);

export const CORRELATIONS_SOURCE_SECTION_TABLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsAlertsBySourceSectionTable'
);

export const CORRELATIONS_SOURCE_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsDetailsAlertsBySourceSectionInvestigateInTimeline'
  );

export const CORRELATIONS_SESSION_SECTION_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsAlertsBySessionSectionTitleText'
);

export const CORRELATIONS_SESSION_SECTION_TABLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsAlertsBySessionSectionTable'
);

export const CORRELATIONS_SESSION_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsDetailsAlertsBySessionSectionInvestigateInTimeline'
  );

export const CORRELATIONS_CASES_SECTION_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsCasesSectionTitleText'
);

export const CORRELATIONS_CASES_SECTION_TABLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsCasesSectionTable'
);

export const CORRELATIONS_SUPPRESSED_ALERTS_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutCorrelationsDetailsSuppressedAlertsSectionTitleText'
);

export const CORRELATIONS_SUPPRESSED_ALERTS_INVESTIGATE_IN_TIMELINE_BUTTON =
  getDataTestSubjectSelector(
    'securitySolutionFlyoutCorrelationsDetailsSuppressedAlertsSectionInvestigateInTimeline'
  );

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

/* Header */

export const HEADER_TITLE_TEST_ID = `${PREFIX}AlertTitle` as const;
export const HEADER_TITLE_LINK_TEST_ID = `${PREFIX}AlertTitleLink` as const;

/* About */

const ALERT_DESCRIPTION_TEST_ID = `${PREFIX}AlertDescription` as const;
export const ALERT_DESCRIPTION_TITLE_TEST_ID = `${ALERT_DESCRIPTION_TEST_ID}Title` as const;
export const ALERT_DESCRIPTION_DETAILS_TEST_ID = `${ALERT_DESCRIPTION_TEST_ID}Details` as const;
export const RULE_SUMMARY_BUTTON_TEST_ID = `${PREFIX}RuleSummaryButton` as const;

const REASON_TEST_ID = `${PREFIX}Reason` as const;
export const REASON_TITLE_TEST_ID = `${REASON_TEST_ID}Title` as const;
export const REASON_DETAILS_TEST_ID = `${REASON_TEST_ID}Details` as const;
export const REASON_DETAILS_PREVIEW_BUTTON_TEST_ID = `${REASON_TEST_ID}PreviewButton` as const;

const WORKFLOW_STATUS_TEST_ID = `${PREFIX}WorkflowStatus` as const;
export const WORKFLOW_STATUS_TITLE_TEST_ID = `${WORKFLOW_STATUS_TEST_ID}Title` as const;
export const WORKFLOW_STATUS_DETAILS_TEST_ID = `${WORKFLOW_STATUS_TEST_ID}Details` as const;

const MITRE_ATTACK_TEST_ID = `${PREFIX}MitreAttack` as const;
export const MITRE_ATTACK_TITLE_TEST_ID = `${MITRE_ATTACK_TEST_ID}Title` as const;
export const MITRE_ATTACK_DETAILS_TEST_ID = `${MITRE_ATTACK_TEST_ID}Details` as const;

/* Investigation */

export const INVESTIGATION_GUIDE_TEST_ID = `${PREFIX}InvestigationGuide` as const;
export const INVESTIGATION_GUIDE_BUTTON_TEST_ID = `${INVESTIGATION_GUIDE_TEST_ID}Button` as const;
export const INVESTIGATION_GUIDE_LOADING_TEST_ID = `${INVESTIGATION_GUIDE_TEST_ID}Loading` as const;

/* Visualizations */

export const ANALYZER_PREVIEW_TEST_ID = `${PREFIX}AnalyzerPreview` as const;
export const ANALYZER_PREVIEW_LOADING_TEST_ID = `${ANALYZER_PREVIEW_TEST_ID}Loading` as const;
export const ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID =
  `${ANALYZER_PREVIEW_TEST_ID}ColdFrozenTierBadge` as const;

export const SESSION_PREVIEW_TEST_ID = `${PREFIX}SessionPreview` as const;
export const SESSION_PREVIEW_RULE_DETAILS_LINK_TEST_ID =
  `${SESSION_PREVIEW_TEST_ID}RuleDetailsLink` as const;
export const SESSION_VIEW_UPSELL_TEST_ID = `${PREFIX}SessionViewUpsell` as const;
export const SESSION_VIEW_NO_DATA_TEST_ID = `${PREFIX}SessionViewNoData` as const;

export const CORRELATIONS_TEST_ID = `${PREFIX}Correlations` as const;
export const CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID =
  `${CORRELATIONS_TEST_ID}SuppressedAlerts` as const;
export const CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID =
  `${CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID}TechnicalPreview` as const;
export const CORRELATIONS_RELATED_CASES_TEST_ID = `${CORRELATIONS_TEST_ID}RelatedCases` as const;
export const CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID =
  `${CORRELATIONS_TEST_ID}RelatedAlertsBySession` as const;
export const CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID =
  `${CORRELATIONS_TEST_ID}RelatedAlertsBySameSourceEvent` as const;
export const CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID =
  `${CORRELATIONS_TEST_ID}RelatedAlertsByAncestry` as const;
export const CORRELATIONS_RELATED_ATTACKS_TEST_ID =
  `${CORRELATIONS_TEST_ID}RelatedAttacks` as const;

export const INSIGHTS_THREAT_INTELLIGENCE_TEST_ID = `${PREFIX}InsightsThreatIntelligence` as const;
export const INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID =
  `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}ThreatMatches` as const;
export const INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID =
  `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}EnrichedWithThreatIntelligence` as const;

export const PREVALENCE_TEST_ID = `${PREFIX}InsightsPrevalence` as const;

export const SUMMARY_ROW_LOADING_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Loading`;
export const SUMMARY_ROW_TEXT_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Text`;
export const SUMMARY_ROW_VALUE_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Value`;
export const SUMMARY_ROW_BUTTON_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Button`;

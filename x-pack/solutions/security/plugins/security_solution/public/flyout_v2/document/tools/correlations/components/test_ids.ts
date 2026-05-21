/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../../../flyout/shared/test_ids';

const CORRELATIONS_DETAILS_TEST_ID = `${PREFIX}CorrelationsDetails` as const;

export const CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}AlertsByAncestrySection` as const;
export const CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}AlertsBySourceSection` as const;
export const CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}AlertsBySessionSection` as const;
export const CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}RelatedAttacksSection` as const;
export const CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}CasesSection` as const;
export const CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}SuppressedAlertsSection` as const;
export const SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}SuppressedAlertsSectionTechnicalPreview` as const;

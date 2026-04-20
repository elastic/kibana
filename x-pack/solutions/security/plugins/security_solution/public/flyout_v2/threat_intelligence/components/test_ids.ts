/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

const THREAT_INTELLIGENCE_DETAILS_TEST_ID = `${PREFIX}ThreatIntelligenceDetails` as const;
export const THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}ThreatMatchDetected` as const;
export const THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}Loading` as const;
export const THREAT_INTELLIGENCE_ENRICHMENTS_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}EnrichedWithThreatIntel` as const;
export const THREAT_INTELLIGENCE_MATCHES_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}MatchesWithNoType` as const;
export const THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}NoEnrichmentFound` as const;
export const THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}EnrichmentTitle` as const;
export const THREAT_INTELLIGENCE_LOADING_ENRICHMENTS_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}LoadingEnrichment` as const;
export const THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}EnrichmentButtonContent` as const;
export const THREAT_INTELLIGENCE_ENRICHMENTS_ACCORDION_TABLE_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}EnrichmentAccordionTable` as const;
export const THREAT_INTELLIGENCE_ENRICHMENTS_RANGE_PICKER_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}EnrichmentRangePicker` as const;
export const THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID =
  `${THREAT_INTELLIGENCE_DETAILS_TEST_ID}EnrichmentRefreshButton` as const;

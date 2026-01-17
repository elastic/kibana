/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../shared/test_ids';

const INSIGHTS_TAB_TEST_ID = `${PREFIX}InsightsTab` as const;
export const INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID =
  `${INSIGHTS_TAB_TEST_ID}EntitiesButton` as const;
export const INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID =
  `${INSIGHTS_TAB_TEST_ID}ThreatIntelligenceButton` as const;
export const INSIGHTS_TAB_PREVALENCE_BUTTON_TEST_ID =
  `${INSIGHTS_TAB_TEST_ID}PrevalenceButton` as const;
export const INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID =
  `${INSIGHTS_TAB_TEST_ID}CorrelationsButton` as const;

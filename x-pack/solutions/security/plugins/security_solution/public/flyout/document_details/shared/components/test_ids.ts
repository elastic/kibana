/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../shared/test_ids';

const INSIGHTS_TEST_ID = `${PREFIX}Insights` as const;
export const INSIGHTS_ALERTS_COUNT_TEXT_TEST_ID = `${INSIGHTS_TEST_ID}AlertsCount` as const;
export const INSIGHTS_ALERTS_COUNT_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID =
  `${INSIGHTS_TEST_ID}AlertsCountInvestigateInTimelineButton` as const;
export const INSIGHTS_ALERTS_COUNT_NAVIGATION_BUTTON_TEST_ID =
  `${INSIGHTS_TEST_ID}AlertsCountNavigationButton` as const;

export const FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID = `${PREFIX}FooterDropdownButton` as const;

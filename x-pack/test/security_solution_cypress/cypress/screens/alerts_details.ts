/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERT_FLYOUT = '[data-test-subj="timeline:details-panel:flyout"]';

export const CELL_TEXT = '.euiText';

export const ENRICHMENT_COUNT_NOTIFICATION = '[data-test-subj="enrichment-count-notification"]';

export const ENRICHMENT_QUERY_RANGE_PICKER = '[data-test-subj="enrichment-query-range-picker"]';

export const ENRICHMENT_QUERY_START_INPUT = '.start-picker';

export const ENRICHMENT_QUERY_END_INPUT = '.end-picker';

export const FILTER_INPUT = '[data-test-subj="eventDetails"] .euiFieldSearch';

export const INDICATOR_MATCH_ENRICHMENT_SECTION = '[data-test-subj="threat-match-detected"]';

export const INVESTIGATION_TIME_ENRICHMENT_SECTION =
  '[data-test-subj="enriched-with-threat-intel"]';

export const JSON_VIEW_TAB = '[data-test-subj="jsonViewTab"]';

export const JSON_TEXT = '[data-test-subj="jsonView"]';

export const OVERVIEW_RULE = '[data-test-subj="eventDetails"] [data-test-subj="ruleName"]';

export const OVERVIEW_STATUS = '[data-test-subj="eventDetails"] [data-test-subj="alertStatus"]';

export const EVENT_DETAILS_ALERT_STATUS_POPOVER =
  '[data-test-subj="event-details-alertStatusPopover"]';

export const SUMMARY_VIEW = '[data-test-subj="summary-view"]';

export const TABLE_CELL = '.euiTableRowCell';

export const CELL_EXPAND_VALUE = '[data-test-subj="euiDataGridCellExpandButton"]';

export const CELL_EXPANSION_POPOVER = '[data-test-subj="euiDataGridExpansionPopover"]';

export const USER_DETAILS_LINK = '[data-test-subj="users-link-anchor"]';

export const TABLE_TAB = '[data-test-subj="tableTab"]';

export const TABLE_CONTAINER = '[data-test-subj="event-fields-browser"]';

export const TABLE_ROWS = '.euiTableRow';

export const THREAT_DETAILS_ACCORDION = '.euiAccordion__triggerWrapper';

export const THREAT_DETAILS_VIEW = '[data-test-subj="threat-details-view-0"]';

export const THREAT_INTEL_TAB = '[data-test-subj="threatIntelTab"]';

export const UPDATE_ENRICHMENT_RANGE_BUTTON = '[data-test-subj="enrichment-button"]';

export const SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON = `${SUMMARY_VIEW} [aria-label='Investigate in timeline']`;

export const INSIGHTS_RELATED_ALERTS_BY_SESSION = `[data-test-subj='related-alerts-by-session']`;

export const INSIGHTS_INVESTIGATE_IN_TIMELINE_BUTTON = `${INSIGHTS_RELATED_ALERTS_BY_SESSION} [aria-label='Investigate in timeline']`;

export const INSIGHTS_RELATED_ALERTS_BY_ANCESTRY = `[data-test-subj='related-alerts-by-ancestry']`;

export const INSIGHTS_INVESTIGATE_ANCESTRY_ALERTS_IN_TIMELINE_BUTTON = `[data-test-subj='investigate-ancestry-in-timeline']`;

export const ENRICHED_DATA_ROW = `[data-test-subj='EnrichedDataRow']`;

export const COPY_ALERT_FLYOUT_LINK = `[data-test-subj="copy-alert-flyout-link"]`;

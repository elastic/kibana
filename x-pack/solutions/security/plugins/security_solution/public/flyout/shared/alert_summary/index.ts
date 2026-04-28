/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AlertSummarySection,
  ALERT_SUMMARY_SECTION_TEST_ID,
} from './components/alert_summary_section';
export type { AlertSummarySectionProps } from './components/alert_summary_section';

export {
  AlertSummary,
  ALERT_SUMMARY_TEST_ID,
  COPY_INSIGHTS_BUTTON_TEST_ID,
  GENERATE_INSIGHTS_BUTTON_TEST_ID,
  REGENERATE_INSIGHTS_BUTTON_TEST_ID,
} from './components/alert_summary';
export type { AlertSummaryProps } from './components/alert_summary';

export {
  AlertSummaryOptionsMenu,
  ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID,
  ALERT_SUMMARY_OPTIONS_MENU_PANELS_TEST_ID,
} from './components/alert_summary_options_menu';
export type { AlertSummaryOptionsMenuProps } from './components/alert_summary_options_menu';

export {
  AnonymizationSwitch,
  ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID,
} from './components/anonymization_switch';
export type { AnonymizationSwitchProps } from './components/anonymization_switch';

export {
  ConnectorMissingCallout,
  MISSING_CONNECTOR_CALLOUT_TEST_ID,
  MISSING_CONNECTOR_CALLOUT_LINK_TEST_ID,
} from './components/connector_missing_callout';
export type { ConnectorMissingCalloutProps } from './components/connector_missing_callout';

export { MessageText, MESSAGE_TEXT_TEST_ID } from './components/message_text';
export type { MessageTextProps } from './components/message_text';

export { useAlertSummary } from './hooks/use_alert_summary';
export type { UseAlertSummaryParams, UseAlertSummaryResult } from './hooks/use_alert_summary';

export { useFetchAlertSummary } from './hooks/use_fetch_alert_summary';
export type { UseFetchAlertSummaryParams } from './hooks/use_fetch_alert_summary';

export { useBulkUpdateAlertSummary } from './hooks/use_bulk_update_alert_summary';

export { useAnonymizationToggle } from './hooks/use_anonymization_toggle';
export type { UseAnonymizationToggleResult } from './hooks/use_anonymization_toggle';

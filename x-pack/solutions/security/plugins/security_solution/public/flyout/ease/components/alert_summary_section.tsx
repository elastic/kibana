/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { AlertSummarySection as SharedAlertSummarySection } from '../../shared/alert_summary';
import { useEaseDetailsContext } from '../context';

export const ALERT_SUMMARY_SECTION_TEST_ID = 'ease-alert-flyout-alert-summary-section';

export interface AlertSummarySectionProps {
  /**
   * The Elastic AI Assistant will invoke this function to retrieve the context data,
   * which will be included in a prompt (e.g. the contents of an alert or an event)
   */
  getPromptContext: () => Promise<string> | Promise<Record<string, string[]>>;
}

/**
 * Alert summary section of EASE alert summary alert flyout.
 *
 * Thin wrapper around the shared `AlertSummarySection` — pulls the alert id
 * from `useEaseDetailsContext` and forwards it as a prop so the shared
 * component stays context-agnostic.
 */
export const AlertSummarySection = memo(({ getPromptContext }: AlertSummarySectionProps) => {
  const { eventId } = useEaseDetailsContext();

  return (
    <SharedAlertSummarySection
      alertId={eventId}
      getPromptContext={getPromptContext}
      data-test-subj={ALERT_SUMMARY_SECTION_TEST_ID}
    />
  );
});

AlertSummarySection.displayName = 'AlertSummarySection';

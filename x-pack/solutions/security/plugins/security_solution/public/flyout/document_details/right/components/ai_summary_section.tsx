/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { AlertSummarySection } from '../../../shared/alert_summary';
import { useDocumentDetailsContext } from '../../shared/context';
import { getRawData } from '../../../../assistant/helpers';
import { AI_SUMMARY_TEST_ID } from './test_ids';

/**
 * AI summary section under the overview tab of the legacy alert details
 * flyout. Thin wrapper around the shared `AlertSummarySection` — pulls the
 * required data from `useDocumentDetailsContext` and forwards it as props
 * so the shared section stays context-agnostic.
 */
export const AISummarySection = memo(() => {
  const { eventId, dataFormattedForFieldBrowser } = useDocumentDetailsContext();

  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser),
    [dataFormattedForFieldBrowser]
  );

  return (
    <AlertSummarySection
      alertId={eventId}
      getPromptContext={getPromptContext}
      data-test-subj={AI_SUMMARY_TEST_ID}
    />
  );
});

AISummarySection.displayName = 'AISummarySection';

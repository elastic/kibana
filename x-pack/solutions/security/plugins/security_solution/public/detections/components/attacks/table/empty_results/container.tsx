/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { EmptyResultsPrompt } from './prompt';
import { EmptyResultsFooter } from './footer';

export const EMPTY_RESULTS_CONTAINER_DATA_TEST_ID = 'emptyResultsContainer' as string;
export const EMPTY_RESULTS_MESSAGE_DATA_TEST_ID = 'emptyResultsMessage' as string;
export const EMPTY_RESULTS_FOOTER_DATA_TEST_ID = 'emptyResultsFooter' as string;

interface EmptyResultsContainerProps {
  /** Callback to open the schedules flyout */
  openSchedulesFlyout: () => void;
}

/**
 * Renders the empty results state for the attacks table.
 * It displays different messages based on whether there are filters applied or if there are any schedules configured.
 */
export const EmptyResultsContainer: React.FC<EmptyResultsContainerProps> = React.memo(
  ({ openSchedulesFlyout }) => (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj={EMPTY_RESULTS_CONTAINER_DATA_TEST_ID}
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem data-test-subj={EMPTY_RESULTS_MESSAGE_DATA_TEST_ID} grow={false}>
        <EmptyResultsPrompt openSchedulesFlyout={openSchedulesFlyout} />
      </EuiFlexItem>

      <EuiSpacer size="xxl" />

      <EuiFlexItem data-test-subj={EMPTY_RESULTS_FOOTER_DATA_TEST_ID} grow={false}>
        <EmptyResultsFooter />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
EmptyResultsContainer.displayName = 'EmptyResultsContainer';

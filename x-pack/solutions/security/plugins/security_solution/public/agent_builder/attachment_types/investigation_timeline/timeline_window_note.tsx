/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimelineTimestamp } from './timeline_timestamp';
import type { InvestigationTimelineWindow } from './types';

export const TIMELINE_WINDOW_NOTE_TEST_ID = 'investigationTimelineWindow';

export interface TimelineWindowNoteProps {
  window: InvestigationTimelineWindow;
  showRawOnHover?: boolean;
}

/** One line naming the range the telemetry was searched over, so sparse or empty timelines say what they cover. */
export const TimelineWindowNote = ({ window, showRawOnHover = true }: TimelineWindowNoteProps) => (
  <EuiText size="xs" color="subdued" data-test-subj={TIMELINE_WINDOW_NOTE_TEST_ID}>
    <FormattedMessage
      id="xpack.securitySolution.agentBuilder.investigationTimeline.searchedWindow"
      defaultMessage="Searched window: {start} to {end}"
      values={{
        start: <TimelineTimestamp value={window.start} showRawOnHover={showRawOnHover} />,
        end: <TimelineTimestamp value={window.end} showRawOnHover={showRawOnHover} />,
      }}
    />
  </EuiText>
);

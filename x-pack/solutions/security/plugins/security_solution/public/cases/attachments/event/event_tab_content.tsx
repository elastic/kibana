/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CommonAttachmentTabViewProps } from '@kbn/cases-plugin/public';
import { EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EventsTableForCases } from '../../components/case_events/table';

interface EventItem {
  eventId: string;
  index: string;
}

/** Unified event attachment shape (case resolve uses mode='unified'). */
interface UnifiedEventAttachment {
  type: string;
  attachmentId: string;
  metadata?: { index?: string };
}

const toEventItem = (attachment: UnifiedEventAttachment): EventItem => ({
  eventId: attachment.attachmentId,
  index: attachment.metadata?.index ?? '',
});

export const EventTabContent: React.FC<CommonAttachmentTabViewProps> = ({ caseData }) => {
  const events = useMemo(
    () =>
      caseData.comments
        .filter((comment) => comment.type === EVENT_ATTACHMENT_TYPE)
        .map((attachment) => toEventItem(attachment as UnifiedEventAttachment))
        .filter((e) => e.eventId && e.index.trim()),
    [caseData.comments]
  );

  return (
    <EuiFlexItem
      css={css`
        width: 100%;
      `}
      data-test-subj="case-view-events"
    >
      <EventsTableForCases events={events} />
    </EuiFlexItem>
  );
};

EventTabContent.displayName = 'EventTabContent';

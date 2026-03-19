/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CommonAttachmentTabViewProps } from '@kbn/cases-plugin/public';
import { EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EventsTableForCases } from '../../components/case_events/table';
import {
  SnapshotEventsTable,
  getTimestampFromSnapshot,
  type SnapshotEventItem,
} from './snapshot_events_table';

interface EventItem {
  eventId: string;
  index: string;
}

/** Unified event attachment shape (case resolve uses mode='unified'). */
interface UnifiedEventAttachment {
  type: string;
  attachmentId: string;
  metadata?: { index?: string };
  data?: { snapshot?: string };
}

const toEventItem = (attachment: UnifiedEventAttachment): EventItem => ({
  eventId: attachment.attachmentId,
  index: attachment.metadata?.index ?? '',
});

const toSnapshotEventItem = (attachment: UnifiedEventAttachment): SnapshotEventItem | null => {
  const snapshot = attachment.data?.snapshot;
  if (typeof snapshot !== 'string' || !snapshot.trim()) return null;
  return {
    id: attachment.attachmentId,
    snapshot,
    timestamp: getTimestampFromSnapshot(snapshot),
  };
};

export const EventTabContent: React.FC<CommonAttachmentTabViewProps> = ({ caseData }) => {
  const eventAttachments = useMemo(
    () =>
      caseData.comments
        .filter((comment) => comment.type === EVENT_ATTACHMENT_TYPE)
        .map((c) => c as UnifiedEventAttachment),
    [caseData.comments]
  );

  const snapshotEvents = useMemo(
    () =>
      eventAttachments
        .map(toSnapshotEventItem)
        .filter((item): item is SnapshotEventItem => item != null),
    [eventAttachments]
  );

  const liveEvents = useMemo(
    () => eventAttachments.map(toEventItem).filter((e) => e.eventId && e.index.trim()),
    [eventAttachments]
  );

  return (
    <EuiFlexItem
      css={css`
        width: 100%;
      `}
      data-test-subj="case-view-events"
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        {snapshotEvents.length > 0 && (
          <>
            <EuiFlexItem grow={false} />
            <EuiFlexItem>
              <SnapshotEventsTable items={snapshotEvents} />
            </EuiFlexItem>
            {liveEvents.length > 0 && <EuiSpacer size="l" />}
          </>
        )}
        {liveEvents.length > 0 && (
          <EuiFlexItem>
            <EventsTableForCases events={liveEvents} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

EventTabContent.displayName = 'EventTabContent';

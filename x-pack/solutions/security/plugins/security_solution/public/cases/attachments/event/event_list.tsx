/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentListRendererProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { CaseViewEventsTableProps } from '@kbn/cases-plugin/common/ui';
import { EVENT_ATTACHMENT_TYPE, isRegisteredAttachmentType } from '@kbn/cases-plugin/common';
import type { RegisteredAttachment } from '@kbn/cases-plugin/common/types/domain';
import { EventsTableForCases } from '../../components/case_events/table';

export const EventList = ({ caseData }: AttachmentListRendererProps) => {
  const events: CaseViewEventsTableProps['events'] = [];

  caseData.comments.forEach((comment) => {
    // Handle registered event attachments (type: "event" with attachmentId and metaData)
    if (isRegisteredAttachmentType(comment.type) && comment.type === EVENT_ATTACHMENT_TYPE) {
      const registeredAttachment = comment as unknown as RegisteredAttachment;
      const attachmentId = registeredAttachment.attachmentId;
      const index = (registeredAttachment.metaData?.index as string | string[]) || '';

      if (attachmentId) {
        events.push({
          eventId: attachmentId,
          index,
        });
      }
    }
  });

  return (
    <EuiFlexGroup>
      <EuiFlexItem
        css={css`
          width: 100%;
        `}
        data-test-subj="case-view-events"
      >
        <EuiText>{'Custom event list'}</EuiText>
        <EventsTableForCases events={events} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

EventList.displayName = 'EventList';

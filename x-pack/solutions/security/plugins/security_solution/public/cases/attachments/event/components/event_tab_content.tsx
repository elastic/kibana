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
import {
  SECURITY_EVENT_ATTACHMENT_TYPE,
  isUnifiedEventAttachment,
  toStringOrStringArray,
} from '@kbn/cases-plugin/common';
import type { Event } from './table';
import { EventsTableForCases } from './table';

export const EventTabContent: React.FC<CommonAttachmentTabViewProps> = ({ caseData }) => {
  const events = useMemo(
    () =>
      caseData.comments.reduce((acc, comment) => {
        if (comment.type === SECURITY_EVENT_ATTACHMENT_TYPE && isUnifiedEventAttachment(comment)) {
          const attachmentId = toStringOrStringArray(comment.attachmentId);
          if (attachmentId == null) {
            return acc;
          }

          acc.push({
            eventId: attachmentId,
            index: toStringOrStringArray(comment?.metadata?.index) ?? '',
          });
        }
        return acc;
      }, [] as Event[]),
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

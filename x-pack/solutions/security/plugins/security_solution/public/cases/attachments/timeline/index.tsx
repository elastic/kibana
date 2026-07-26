/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import { defineAttachment } from '@kbn/cases-plugin/public';
import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { TimelineAttachmentPayloadSchema } from '../../../../common/cases/attachments/timeline';
import * as i18n from './translations';

// Shared across every rendered timeline attachment row: one dynamic chunk for
// the link component (privileges, upsell gating, toasts), loaded on first use.
const LazyTimelineLink = lazy(async () => {
  const { TimelineLink: Component } = await import('./timeline_link');
  return { default: Component };
});

// Single chunk for the attachment-tab timelines table; loaded only when the tab is opened.
const LazyCaseViewTimelines = lazy(async () => {
  const { CaseViewTimelines: Component } = await import('./case_view_timelines');
  return { default: Component };
});

const CaseViewTimelinesTab: React.FC<React.ComponentProps<typeof LazyCaseViewTimelines>> = (
  props
) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <LazyCaseViewTimelines {...props} />
  </Suspense>
);
CaseViewTimelinesTab.displayName = 'CaseViewTimelinesTab';

/**
 * Defines the `security.timeline` cases attachment registered with the cases attachment framework.
 */
export const getTimelineAttachment = () =>
  defineAttachment({
    id: SECURITY_TIMELINE_ATTACHMENT_TYPE,
    icon: 'timeline',
    displayName: i18n.TIMELINE_DISPLAY_NAME,
    schema: TimelineAttachmentPayloadSchema,
    getAttachmentViewObject: (props) => {
      const { savedObjectId, attachmentId, metadata } = props;
      const title = metadata?.title ?? '';

      return {
        eventColor: 'subdued' as const,
        event: (
          <Suspense fallback={null}>
            <LazyTimelineLink
              savedObjectId={savedObjectId}
              timelineId={attachmentId}
              title={title}
            />
          </Suspense>
        ),
        timelineAvatar: (
          <EuiAvatar
            name="timeline"
            color="subdued"
            iconType="timeline"
            aria-label={i18n.TIMELINE_AVATAR_ARIA}
          />
        ),
        deleteSuccessTitle: i18n.DELETE_TIMELINE_SUCCESS_TITLE,
      };
    },
    getAttachmentRemovalObject: () => ({
      event: i18n.REMOVED_TIMELINE_LABEL,
    }),
    getAttachmentTabViewObject: () => ({ children: CaseViewTimelinesTab }),
  });

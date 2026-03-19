/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import type {
  CommonAttachmentTabViewProps,
  UnifiedReferenceAttachmentType,
} from '@kbn/cases-plugin/public';
import { AttachmentActionType } from '@kbn/cases-plugin/public';
import { EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { ShowEventButton } from './show_event_button';
import { SingleEventCommentLabel } from './event_comment_label';
import { EventTabContent } from './event_tab_content';
import { REMOVED_EVENT_LABEL_TITLE, REMOVED_EVENTS_LABEL_TITLE } from './translations';

const getEventAttachmentViewObject = (props: UnifiedReferenceAttachmentViewProps) => {
  // attachmentId = event id (external ref); savedObjectId = comment saved object id
  const eventId = props.attachmentId;
  const rawIndex = props.metadata?.index ?? '';
  const index = typeof rawIndex === 'string' ? rawIndex.trim() : '';

  return {
    event: <SingleEventCommentLabel actionId={eventId} />,
    timelineAvatar: <EuiAvatar name="event" color="subdued" iconType="bell" aria-label="event" />,
    getActions: (
      actionProps: UnifiedReferenceAttachmentViewProps & {
        onShowEventDetails?: (a: string, b: string) => void;
      }
    ) => {
      const actions = [];
      // Require non-empty index; flyout search fails with empty index (SearchInterceptor "fields" error)
      if (eventId && index) {
        const onShowEventDetails = actionProps.onShowEventDetails;
        actions.push({
          type: AttachmentActionType.CUSTOM as const,
          isPrimary: true,
          render: () => (
            <ShowEventButton
              id={actionProps.savedObjectId}
              eventId={eventId}
              index={index as string}
              onShowEventDetails={onShowEventDetails}
            />
          ),
        });
      }
      return actions;
    },
  };
};

/**
 * Returns the event attachment type for registration with the unified registry.
 * Renders event row via SingleEventCommentLabel and ShowEventButton, and events tab via EventTabContent.
 */
export const getEventType = (): UnifiedReferenceAttachmentType => ({
  id: EVENT_ATTACHMENT_TYPE,
  displayName: 'Event',
  icon: 'bell',
  getAttachmentViewObject: (props: UnifiedReferenceAttachmentViewProps) =>
    getEventAttachmentViewObject(props),
  getAttachmentRemovalObject: (props) => {
    const eventCount = (props as { eventCount?: number }).eventCount ?? 1;

    return {
      event: eventCount === 1 ? REMOVED_EVENT_LABEL_TITLE : REMOVED_EVENTS_LABEL_TITLE(eventCount),
    };
  },
  getAttachmentTabViewObject: (_props: CommonAttachmentTabViewProps) => ({
    children: EventTabContent,
  }),
});

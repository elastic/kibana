/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { RegisteredAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { UserActionTimestamp } from '@kbn/cases-plugin/public/components/user_actions/timestamp';
import { HoverableUserWithAvatarResolver } from '@kbn/cases-plugin/public/components/user_profiles/hoverable_user_with_avatar_resolver';
import { UserActionContentToolbar } from '@kbn/cases-plugin/public/components/user_actions/content_toolbar';
import type { RegisteredAttachment } from '@kbn/cases-plugin/common/types/domain';
import { SingleEventCommentEvent, MultipleEventsCommentEvent } from './event_attachment_event';
import { EventShowEvent } from './show_event';
import { EventPropertyActions } from './event_property_actions';
import { DELETE_EVENTS_SUCCESS_TITLE } from './translations';

interface EventRendererProps extends RegisteredAttachmentViewProps {
  attachment: RegisteredAttachment;
  userAction: {
    id: string;
    createdAt: string;
    createdBy: {
      username: string | null | undefined;
      fullName: string | null | undefined;
      email: string | null | undefined;
    };
  };
  userProfiles: Map<string, UserProfileWithAvatar>;
  onShowEventDetails?: (eventId: string, index: string) => void;
  handleDeleteComment: (commentId: string, title: string) => void;
  loadingCommentIds: string[];
}

const getFirstItem = (items?: string | string[] | null): string | null => {
  return Array.isArray(items) ? items[0] : items ?? null;
};

function getNonEmptyField(field: string | string[] | undefined | null): string | null {
  const firstItem = getFirstItem(field);
  if (firstItem == null || isEmpty(firstItem)) {
    return null;
  }

  return firstItem;
}

const getSingleEventUserAction = ({
  userAction,
  userProfiles,
  attachmentId,
  metaData,
  attachment,
  loadingCommentIds,
  onShowEventDetails,
  handleDeleteComment,
}: EventRendererProps): EuiCommentProps[] => {
  const eventId = getNonEmptyField(attachmentId);
  const eventIndex = getNonEmptyField(metaData?.index as string | string[] | undefined | null);

  if (!eventId || !eventIndex) {
    return [];
  }

  return [
    {
      username: (
        <HoverableUserWithAvatarResolver user={userAction.createdBy} userProfiles={userProfiles} />
      ),
      eventColor: 'subdued',
      event: <SingleEventCommentEvent actionId={userAction.id} />,
      'data-test-subj': `user-action-event-${userAction.id}`,
      timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
      timelineAvatar: 'bell',
      actions: (
        <UserActionContentToolbar id={attachment.id}>
          <EuiFlexItem grow={false}>
            <EventShowEvent
              id={userAction.id}
              attachmentId={attachmentId}
              index={metaData?.index as string | string[]}
              onShowEventDetails={onShowEventDetails}
            />
          </EuiFlexItem>
          <EventPropertyActions
            onDelete={() => handleDeleteComment(attachment.id, DELETE_EVENTS_SUCCESS_TITLE(1))}
            isLoading={loadingCommentIds.includes(attachment.id)}
            totalEvents={1}
          />
        </UserActionContentToolbar>
      ),
    },
  ];
};

const getMultipleEventsUserAction = ({
  userAction,
  userProfiles,
  attachmentId,
  attachment,
  loadingCommentIds,
  handleDeleteComment,
}: EventRendererProps): EuiCommentProps[] => {
  if (!Array.isArray(attachmentId)) {
    return [];
  }

  const totalEvents = attachmentId.length;

  return [
    {
      username: (
        <HoverableUserWithAvatarResolver user={userAction.createdBy} userProfiles={userProfiles} />
      ),
      eventColor: 'subdued',
      event: <MultipleEventsCommentEvent actionId={userAction.id} totalEvents={totalEvents} />,
      'data-test-subj': `user-action-event-${userAction.id}`,
      timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
      timelineAvatar: 'bell',
      actions: (
        <UserActionContentToolbar id={attachment.id}>
          <EventPropertyActions
            onDelete={() =>
              handleDeleteComment(attachment.id, DELETE_EVENTS_SUCCESS_TITLE(totalEvents))
            }
            isLoading={loadingCommentIds.includes(attachment.id)}
            totalEvents={totalEvents}
          />
        </UserActionContentToolbar>
      ),
    },
  ];
};

export const EventAttachmentRenderer = (props: EventRendererProps): EuiCommentProps[] => {
  const { attachmentId } = props;
  const eventIds = Array.isArray(attachmentId) ? attachmentId : [attachmentId];

  if (eventIds.length === 1) {
    return getSingleEventUserAction(props);
  }

  return getMultipleEventsUserAction(props);
};

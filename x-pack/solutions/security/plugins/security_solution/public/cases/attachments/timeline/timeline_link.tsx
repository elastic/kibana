/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { UserActionTitle } from '@kbn/cases-components';
import { useUpsellingMessage } from '../../../common/hooks/use_upselling';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useTimelineClick } from '../../../common/utils/timeline/use_timeline_click';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

export interface TimelineLinkProps {
  savedObjectId: string;
  timelineId: string;
  title: string;
}

export const TimelineLink: React.FC<TimelineLinkProps> = memo(
  ({ savedObjectId, timelineId, title }) => {
    const { addError } = useAppToasts();
    const interactionsUpsellingMessage = useUpsellingMessage('investigation_guide_interactions');
    const {
      timelinePrivileges: { read: canReadTimelines },
    } = useUserPrivileges();
    const handleTimelineClick = useTimelineClick();

    const isDisabled = !!interactionsUpsellingMessage || !canReadTimelines;

    const onError = useCallback(
      (error: Error, errorTimelineId: string) => {
        addError(error, {
          title: i18n.TIMELINE_ERROR_TITLE,
          toastMessage: i18n.FAILED_TO_RETRIEVE_TIMELINE(errorTimelineId),
        });
      },
      [addError]
    );

    const onClick = useCallback(() => {
      if (isDisabled) return;
      handleTimelineClick(timelineId, onError);
    }, [handleTimelineClick, isDisabled, onError, timelineId]);

    return (
      <UserActionTitle
        label={i18n.ADDED_TIMELINE_LABEL}
        link={{
          targetId: timelineId,
          label: title,
          dataTestSubj: `timeline-attachment-link-${timelineId}`,
          onClick,
        }}
        dataTestSubj={`timeline-user-action-${savedObjectId}`}
      />
    );
  }
);
TimelineLink.displayName = 'TimelineLink';

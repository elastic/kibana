/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import {
  useCaseViewNavigation,
  useCaseViewParams,
} from '@kbn/cases-plugin/public/common/navigation';
import { CASE_VIEW_PAGE_TABS } from '@kbn/cases-plugin/common/types';
import * as i18n from './translations';

interface EventShowEventProps {
  id: string;
  attachmentId: string | string[];
  index: string | string[];
  onShowEventDetails?: (eventId: string, index: string) => void;
}

const EventShowEventComponent = ({
  id,
  attachmentId,
  index,
  onShowEventDetails,
}: EventShowEventProps) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();

  const eventId = Array.isArray(attachmentId) ? attachmentId[0] : attachmentId;
  const eventIndex = Array.isArray(index) ? index[0] : index;

  const onClick = useCallback(() => {
    if (onShowEventDetails && eventId && eventIndex) {
      onShowEventDetails(eventId, eventIndex);
    } else {
      navigateToCaseView({ detailName, tabId: CASE_VIEW_PAGE_TABS.EVENTS });
    }
  }, [eventId, detailName, eventIndex, navigateToCaseView, onShowEventDetails]);

  return (
    <EuiToolTip position="top" content={<p>{i18n.SHOW_EVENT_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={i18n.SHOW_EVENT_TOOLTIP}
        data-test-subj={`comment-action-show-event-${id}`}
        onClick={onClick}
        iconType="arrowRight"
        id={`${id}-show-event`}
      />
    </EuiToolTip>
  );
};

EventShowEventComponent.displayName = 'EventShowEvent';

export const EventShowEvent = memo(EventShowEventComponent);

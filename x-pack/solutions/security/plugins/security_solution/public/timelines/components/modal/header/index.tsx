/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux-v7';
import type { State } from '../../../../common/store';
import { selectIsSuperTimeline } from '../../../store/selectors';
import { SuperTimelineModalHeader } from './super_timeline_modal_header';
import { RegularTimelineModalHeader } from './regular_timeline_modal_header';
import type { TimelineModalHeaderBaseProps } from './types';

export type { TimelineModalHeaderBaseProps };

/**
 * Component rendered at the top of the timeline modal. It contains the timeline title, all the action buttons (save, open, favorite...) and the close button
 */
export const TimelineModalHeader = React.memo<TimelineModalHeaderBaseProps>(
  ({ timelineId, openToggleRef }) => {
    const isSuperTimeline = useSelector((state: State) => selectIsSuperTimeline(state, timelineId));

    return isSuperTimeline ? (
      <SuperTimelineModalHeader timelineId={timelineId} openToggleRef={openToggleRef} />
    ) : (
      <RegularTimelineModalHeader timelineId={timelineId} openToggleRef={openToggleRef} />
    );
  }
);

TimelineModalHeader.displayName = 'TimelineModalHeader';

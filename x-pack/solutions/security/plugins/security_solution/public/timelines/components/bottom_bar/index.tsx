/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { State } from '../../../common/store';
import { timelineActions } from '../../store';
import { selectTitleByTimelineById } from '../../store/selectors';
import { AddToFavoritesButton } from '../add_to_favorites';
import { TimelineSaveStatus } from '../save_status';
import TimelineQueryTabEventsCount from '../timeline/tabs/query/events_count';
import { AddTimelineButton } from './add_timeline_button';
import * as i18n from './translations';

const BOTTOM_BAR_STYLE = {
  overflowX: 'auto',
  overflowY: 'hidden',
} as const;

const TITLE_BUTTON_STYLE = {
  whiteSpace: 'nowrap',
  display: 'inline-block',
} as const;

interface TimelineBottomBarProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the modal
   */
  timelineId: string;
  /**
   * True if the timeline modal is open
   */
  show: boolean;

  openToggleRef: React.MutableRefObject<null | HTMLAnchorElement | HTMLButtonElement>;
}

/**
 * This component renders the bottom bar for timeline displayed or most of the pages within Security Solution.
 */
export const TimelineBottomBar = React.memo<TimelineBottomBarProps>(
  ({ show, timelineId, openToggleRef }) => {
    const dispatch = useDispatch();

    const openTimeline = useCallback(
      () => dispatch(timelineActions.showTimeline({ id: timelineId, show: true })),
      [dispatch, timelineId]
    );

    const title = useSelector((state: State) => selectTitleByTimelineById(state, timelineId));

    return (
      <EuiPanel
        borderRadius="none"
        hasShadow={false}
        data-test-subj="timeline-bottom-bar"
        style={BOTTOM_BAR_STYLE}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <AddTimelineButton timelineId={timelineId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AddToFavoritesButton timelineId={timelineId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              aria-label={i18n.OPEN_TIMELINE_BUTTON(title)}
              onClick={openTimeline}
              data-test-subj="timeline-bottom-bar-title-button"
              ref={openToggleRef}
              style={TITLE_BUTTON_STYLE}
            >
              {title}
            </EuiLink>
          </EuiFlexItem>
          {!show && ( // We only want to show this when the timeline modal is closed
            <EuiFlexItem grow={false} data-test-subj="timeline-event-count-badge">
              <TimelineQueryTabEventsCount timelineId={timelineId} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <TimelineSaveStatus timelineId={timelineId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

TimelineBottomBar.displayName = 'TimelineBottomBar';

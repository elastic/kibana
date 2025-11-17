/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash/fp';
import { selectIsPinnedEventInTimeline } from '../../../timelines/store/selectors';
import { EventsTdContent } from '../../../timelines/components/timeline/styles';
import type { TimelineType } from '../../../../common/api/timeline';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { useUserPrivileges } from '../user_privileges';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '.';
import type { State } from '../../store';
import { timelineActions } from '../../../timelines/store';
import * as i18n from './translations';

export const BUTTON_TEST_ID = 'timeline-pin-event-button';
export const TOOLTIP_TEST_ID = 'timeline-action-pin-tool-tip';

const eventHasNotes = (noteIds: string[]): boolean => !isEmpty(noteIds);

export interface PinEventActionProps {
  /**
   * Row number to display in the aria label
   */
  ariaRowindex: number;
  /**
   * Column name to display in the aria label
   */
  columnValues: string;
  /**
   * Id of the document to fetch notes and pin state for
   */
  eventId: string;
  /**
   * Object of note ids associated to the event
   */
  eventIdToNoteIds: Readonly<Record<string, string[]>> | undefined;
  /**
   * Indicates if the document is an alert
   */
  isAlert: boolean;
  /**
   * Note ids associated to the event
   */
  noteIds: string[];
  /**
   * Timeline id
   */
  timelineId: string;
  /**
   * Timeline type
   */
  timelineType: TimelineType;
}

/**
 * Component rendering a pin icon button to pin/unpin an alert or event in a timeline
 */
export const PinEventAction = memo(
  ({
    ariaRowindex,
    columnValues,
    eventId,
    eventIdToNoteIds,
    isAlert,
    noteIds,
    timelineId,
    timelineType,
  }: PinEventActionProps) => {
    const dispatch = useDispatch();

    const { timelinePrivileges } = useUserPrivileges();

    const isPinnedSelector = useMemo(() => selectIsPinnedEventInTimeline(), []);
    const isPinned = useSelector((state: State) => isPinnedSelector(state, timelineId, eventId));

    const tooltipContent = useMemo(() => {
      if (timelineType === TimelineTypeEnum.template) {
        return i18n.DISABLE_PIN(isAlert);
      } else if (eventHasNotes(noteIds)) {
        return i18n.PINNED_WITH_NOTES(isAlert);
      } else if (isPinned) {
        return i18n.PINNED(isAlert);
      } else {
        return i18n.UNPINNED(isAlert);
      }
    }, [timelineType, noteIds, isPinned, isAlert]);

    const handlePinClicked = useCallback(() => {
      const allowUnpinning = eventIdToNoteIds ? !eventHasNotes(eventIdToNoteIds[eventId]) : true;
      if (!allowUnpinning) {
        return;
      }
      if (isPinned) {
        dispatch(timelineActions.unPinEvent({ id: timelineId, eventId }));
      } else {
        dispatch(timelineActions.pinEvent({ id: timelineId, eventId }));
      }
    }, [eventIdToNoteIds, eventId, isPinned, dispatch, timelineId]);

    const ariaLabel = useMemo(
      () =>
        timelineType === TimelineTypeEnum.template
          ? i18n.DISABLE_PIN(isAlert)
          : i18n.PIN_EVENT_FOR_ROW({ ariaRowindex, columnValues, isPinned }),
      [ariaRowindex, columnValues, isAlert, isPinned, timelineType]
    );

    const isDisabled = useMemo(
      () =>
        !timelinePrivileges.crud ||
        timelineType === TimelineTypeEnum.template ||
        eventHasNotes(noteIds),
      [noteIds, timelinePrivileges.crud, timelineType]
    );

    return (
      <div key="timeline-action-pin-tool-tip">
        <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
          <EuiToolTip data-test-subj={TOOLTIP_TEST_ID} content={tooltipContent}>
            <EuiButtonIcon
              aria-label={ariaLabel}
              data-test-subj={BUTTON_TEST_ID}
              isDisabled={isDisabled}
              iconType={isPinned ? 'pinFilled' : 'pin'}
              onClick={handlePinClicked}
              size="s"
              color="text"
            />
          </EuiToolTip>
        </EventsTdContent>
      </div>
    );
  }
);

PinEventAction.displayName = 'PinEventAction';

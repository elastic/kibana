/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';

import {
  BUTTON_TEST_ID,
  eventHasNotes,
  getPinTooltipContent,
  PinEventAction,
} from './pin_event_action';
import { useUserPrivileges } from '../user_privileges';
import { createMockStore, mockGlobalState, TestProviders } from '../../mock';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { timelineActions } from '../../../timelines/store';
import { TimelineId } from '../../../../common/types';

jest.mock('../user_privileges');

describe('PinEventAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable button if user does NOT have Timeline crud privileges', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: false, read: true },
    });

    const { getByTestId } = render(
      <TestProviders>
        <PinEventAction
          ariaRowindex={1}
          columnValues={''}
          eventId={'eventId'}
          eventIdToNoteIds={{}}
          isAlert={false}
          noteIds={[]}
          timelineId={TimelineId.test}
          timelineType={TimelineTypeEnum.default}
        />
      </TestProviders>
    );

    expect(getByTestId(BUTTON_TEST_ID)).toHaveProperty('disabled', true);
  });

  it('should disable button if timeline type is template', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: true, read: true },
    });

    const { getByTestId } = render(
      <TestProviders>
        <PinEventAction
          ariaRowindex={1}
          columnValues={''}
          eventId={'eventId'}
          eventIdToNoteIds={{}}
          isAlert={false}
          noteIds={[]}
          timelineId={TimelineId.test}
          timelineType={TimelineTypeEnum.template}
        />
      </TestProviders>
    );

    expect(getByTestId(BUTTON_TEST_ID)).toHaveProperty('disabled', true);
  });

  it('should disable button if there are some notes on that event', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: true, read: true },
    });

    const { getByTestId } = render(
      <TestProviders>
        <PinEventAction
          ariaRowindex={1}
          columnValues={''}
          eventId={'eventId'}
          eventIdToNoteIds={{}}
          isAlert={false}
          noteIds={['note1']}
          timelineId={TimelineId.test}
          timelineType={TimelineTypeEnum.default}
        />
      </TestProviders>
    );

    expect(getByTestId(BUTTON_TEST_ID)).toHaveProperty('disabled', true);
  });

  it('should pin event', async () => {
    const spy = jest.spyOn(timelineActions, 'pinEvent');

    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: true, read: true },
    });

    const { getByTestId } = render(
      <TestProviders>
        <PinEventAction
          ariaRowindex={1}
          columnValues={''}
          eventId={'eventId'}
          eventIdToNoteIds={{}}
          isAlert={false}
          noteIds={[]}
          timelineId={TimelineId.test}
          timelineType={TimelineTypeEnum.default}
        />
      </TestProviders>
    );

    getByTestId(BUTTON_TEST_ID).click();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        id: TimelineId.test,
        eventId: 'eventId',
      });
    });
  });

  it('should unpin event', async () => {
    const spy = jest.spyOn(timelineActions, 'unPinEvent');

    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: true, read: true },
    });

    const mockStore = createMockStore({
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          [TimelineId.test]: {
            ...mockGlobalState.timeline.timelineById[TimelineId.test],
            pinnedEventIds: { eventId: true },
          },
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={mockStore}>
        <PinEventAction
          ariaRowindex={1}
          columnValues={''}
          eventId={'eventId'}
          eventIdToNoteIds={{}}
          isAlert={false}
          noteIds={[]}
          timelineId={TimelineId.test}
          timelineType={TimelineTypeEnum.default}
        />
      </TestProviders>
    );

    getByTestId(BUTTON_TEST_ID).click();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        id: TimelineId.test,
        eventId: 'eventId',
      });
    });
  });
});

describe('eventHasNotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false for when notes is empty', () => {
    expect(eventHasNotes([])).toEqual(false);
  });

  it('should return true when notes is non-empty', () => {
    expect(eventHasNotes(['8af859e2-e4f8-4754-b702-4f227f15aae5'])).toEqual(true);
  });
});

describe('getPinTooltipContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should indicate the event may NOT be unpinned when `isPinned` is `true` and the event has notes', () => {
    expect(getPinTooltipContent(false, true, ['noteId'], TimelineTypeEnum.default)).toEqual(
      'This event cannot be unpinned because it has notes in Timeline'
    );
  });

  it('should indicate the alert may NOT be unpinned when `isPinned` is `true` and the alert has notes', () => {
    expect(getPinTooltipContent(true, true, ['noteId'], TimelineTypeEnum.default)).toEqual(
      'This alert cannot be unpinned because it has notes in Timeline'
    );
  });

  it('should indicate the event is pinned when `isPinned` is `true` and the event does NOT have notes', () => {
    expect(getPinTooltipContent(false, true, [], TimelineTypeEnum.default)).toEqual('Unpin event');
  });

  it('should indicate the alert is pinned when `isPinned` is `true` and the alert does NOT have notes', () => {
    expect(getPinTooltipContent(true, true, [], TimelineTypeEnum.default)).toEqual('Unpin alert');
  });

  it('should indicate the event is pinned when `isPinned` is `false` and the event has notes', () => {
    expect(getPinTooltipContent(false, false, ['noteId'], TimelineTypeEnum.default)).toEqual(
      'This event cannot be unpinned because it has notes in Timeline'
    );
  });

  it('should indicate the alert is pinned when `isPinned` is `false` and the alert has notes', () => {
    expect(getPinTooltipContent(true, false, ['noteId'], TimelineTypeEnum.default)).toEqual(
      'This alert cannot be unpinned because it has notes in Timeline'
    );
  });

  it('should indicate the event is NOT pinned when `isPinned` is `false` and the event does NOT have notes', () => {
    expect(getPinTooltipContent(false, false, [], TimelineTypeEnum.default)).toEqual('Pin event');
  });

  it('should indicate the alert is NOT pinned when `isPinned` is `false` and the alert does NOT have notes', () => {
    expect(getPinTooltipContent(true, false, [], TimelineTypeEnum.default)).toEqual('Pin alert');
  });

  it('should indicate the event is disabled if timelineType is template', () => {
    expect(getPinTooltipContent(false, false, [], TimelineTypeEnum.template)).toEqual(
      'This event may not be pinned while editing a template timeline'
    );
  });

  it('should indicate the alert is disabled if timelineType is template', () => {
    expect(getPinTooltipContent(true, false, [], TimelineTypeEnum.template)).toEqual(
      'This alert may not be pinned while editing a template timeline'
    );
  });
});

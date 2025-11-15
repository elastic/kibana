/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';

import { BUTTON_TEST_ID, PinEventAction } from './pin_event_action';
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

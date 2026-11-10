/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord, RowControlColumn } from '@kbn/discover-utils';
import { render, renderHook, screen } from '@testing-library/react';
import { mockTimelineData, TestProviders } from '../../../../../common/mock';
import { useLicense } from '../../../../../common/hooks/use_license';
import { useTimelineControlColumn } from './use_timeline_control_columns';
import { TimelineId } from '@kbn/timelines-plugin/public/store/timeline';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../../common/components/user_privileges/user_privileges_context';
import { BUTTON_TEST_ID } from '../../../../../common/components/header_actions/pin_event_action';

jest.mock('../../../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({
    isEnterprise: () => true,
  }),
}));
const useLicenseMock = useLicense as jest.Mock;

jest.mock('../../../../../common/components/user_privileges');

const rawEvents = mockTimelineData.map(
  (event) =>
    ({
      _id: event._id,
      _index: 'test-index',
      fields: {},
    } as unknown as EsHitRecord)
);

describe('useTimelineControlColumns', () => {
  const refetchMock = jest.fn();

  describe('leadingControlColumns', () => {
    it('should return the leading control columns', () => {
      const { result } = renderHook(
        () =>
          useTimelineControlColumn({
            timelineId: TimelineId.test,
            refetch: refetchMock,
            events: [],
            rawEvents: [],
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      expect(result.current).toEqual([
        expect.objectContaining({
          id: 'default-timeline-control-column',
          render: expect.any(Function),
        }),
      ]);
    });
    it('should have a width of 124 for 5 actions', () => {
      useLicenseMock.mockReturnValue({
        isEnterprise: () => false,
      });
      const { result } = renderHook(
        () =>
          useTimelineControlColumn({
            timelineId: TimelineId.test,
            refetch: refetchMock,
            events: [],
            rawEvents: [],
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      const controlColumn = result.current[0] as RowControlColumn;
      expect(controlColumn.width).toBe(124);
    });
    it('should have a width of 152 for 6 actions', () => {
      useLicenseMock.mockReturnValue({
        isEnterprise: () => true,
      });
      const { result } = renderHook(
        () =>
          useTimelineControlColumn({
            timelineId: TimelineId.test,
            refetch: refetchMock,
            events: [],
            rawEvents: [],
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      const controlColumn = result.current[0] as RowControlColumn;
      expect(controlColumn.width).toBe(152);
    });
  });

  describe('privileges', () => {
    beforeEach(() => {
      useLicenseMock.mockReturnValue({
        isEnterprise: () => true,
        isPlatinumPlus: () => true,
      });
    });

    it('should render the notes and pin buttons when the user has the correct privileges', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        notesPrivileges: { crud: true, read: true },
        timelinePrivileges: { crud: true },
      });

      const { result } = renderHook(
        () =>
          useTimelineControlColumn({
            timelineId: TimelineId.test,
            refetch: refetchMock,
            events: mockTimelineData,
            rawEvents,
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      render(
        <TestProviders>
          {result.current[0].render(
            () => (
              <></>
            ),
            { record: buildDataTableRecord(rawEvents[0]), rowIndex: 0 }
          )}
        </TestProviders>
      );

      expect(await screen.findByTestId('timeline-notes-button-small')).toBeVisible();
      expect(await screen.findByTestId(BUTTON_TEST_ID)).toBeVisible();
    });

    it('should not render the notes and pin buttons when the user does not have the correct privilege', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        notesPrivileges: { crud: false, read: false },
        timelinePrivileges: { crud: false },
      });

      const { result } = renderHook(
        () =>
          useTimelineControlColumn({
            timelineId: TimelineId.test,
            refetch: refetchMock,
            events: mockTimelineData,
            rawEvents,
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      render(
        <TestProviders>
          {result.current[0].render(
            () => (
              <></>
            ),
            { record: buildDataTableRecord(rawEvents[0]), rowIndex: 0 }
          )}
        </TestProviders>
      );

      expect(await screen.queryByTestId('timeline-notes-button-small')).not.toBeInTheDocument();
      expect(await screen.queryByTestId(BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });
});

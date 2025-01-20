/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiDataGridControlColumn, EuiDataGridCellValueElementProps } from '@elastic/eui';
import { render, renderHook, screen } from '@testing-library/react';
import { TestProviders, mockTimelineData } from '../../../../../common/mock';
import { useLicense } from '../../../../../common/hooks/use_license';
import { useTimelineControlColumn } from './use_timeline_control_columns';
import { TimelineId } from '@kbn/timelines-plugin/public/store/timeline';
import type { UnifiedTimelineDataGridCellContext } from '../../types';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../../common/components/user_privileges/user_privileges_context';
import { useTimelineUnifiedDataTableContext } from '../../unified_components/data_table/use_timeline_unified_data_table_context';

jest.mock('../../../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({
    isEnterprise: () => true,
  }),
}));

jest.mock('../../unified_components/data_table/use_timeline_unified_data_table_context');
jest.mock('../../../../../common/components/user_privileges');

const useLicenseMock = useLicense as jest.Mock;

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
            pinnedEventIds: {},
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      expect(result.current).toMatchSnapshot();
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
            pinnedEventIds: {},
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      const controlColumn = result.current[0] as EuiDataGridControlColumn;
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
            pinnedEventIds: {},
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      const controlColumn = result.current[0] as EuiDataGridControlColumn;
      expect(controlColumn.width).toBe(152);
    });
  });

  describe('privileges', () => {
    const defaultProps = {
      ariaRowindex: 2,
      checked: false,
      columnId: '',
      columnValues: 'abc def',
      disableExpandAction: false,
      data: mockTimelineData[0].data,
      ecsData: mockTimelineData[0].ecs,
      eventId: 'abc',
      eventIdToNoteIds: {},
      index: 2,
      isEventPinned: false,
      loadingEventIds: [],
      onEventDetailsPanelOpened: () => {},
      onRowSelected: () => {},
      refetch: () => {},
      rowIndex: 10,
      setEventsDeleted: () => {},
      setEventsLoading: () => {},
      showCheckboxes: true,
      timelineId: 'test',
      toggleShowNotes: () => {},
      setCellProps: () => {},
      isExpandable: true,
      isExpanded: false,
      isDetails: true,
      colIndex: 0,
    };

    type RowCellRendererComponent = (
      props: EuiDataGridCellValueElementProps & UnifiedTimelineDataGridCellContext
    ) => React.JSX.Element;

    beforeEach(() => {
      useLicenseMock.mockReturnValue({
        isEnterprise: () => true,
        isPlatinumPlus: () => true,
      });
      (useTimelineUnifiedDataTableContext as jest.Mock).mockReturnValue({
        expanded: { id: mockTimelineData[0]._id },
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
            pinnedEventIds: {},
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      const ControlColumnActions = result.current[0].rowCellRender as RowCellRendererComponent;

      render(
        <TestProviders>
          <ControlColumnActions {...defaultProps} />
        </TestProviders>
      );

      expect(await screen.findByTestId('timeline-notes-button-small')).toBeVisible();
      expect(await screen.findByTestId('pin')).toBeVisible();
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
            pinnedEventIds: {},
            eventIdToNoteIds: {},
            onToggleShowNotes: jest.fn(),
          }),
        {
          wrapper: TestProviders,
        }
      );
      const ControlColumnActions = result.current[0].rowCellRender as RowCellRendererComponent;

      render(
        <TestProviders>
          <ControlColumnActions {...defaultProps} />
        </TestProviders>
      );

      expect(await screen.queryByTestId('timeline-notes-button-small')).not.toBeInTheDocument();
      expect(await screen.queryByTestId('pin')).not.toBeInTheDocument();
    });
  });
});

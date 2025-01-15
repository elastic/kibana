/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridControlColumn } from '@elastic/eui';
import { TestProviders } from '../../../../../common/mock';
import { renderHook } from '@testing-library/react';
import { useLicense } from '../../../../../common/hooks/use_license';
import { useTimelineControlColumn } from './use_timeline_control_columns';
import { TimelineId } from '@kbn/timelines-plugin/public/store/timeline';

jest.mock('../../../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({
    isEnterprise: () => true,
  }),
}));

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
});

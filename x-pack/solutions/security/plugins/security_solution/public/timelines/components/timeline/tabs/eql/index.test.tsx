/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useEffect } from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { createMockStore, mockGlobalState, mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';

import type { Props as EqlTabContentComponentProps } from '.';
import EqlTabContentComponent from '.';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../../containers';
import { useTimelineEventsDetails } from '../../../../containers/details';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import type { ExperimentalFeatures } from '../../../../../../common';
import { allowedExperimentalValues } from '../../../../../../common';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as notesApi from '../../../../../notes/api/api';
import { timelineActions } from '../../../../store';
import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { defaultRowRenderers } from '../../body/renderers';
import { useDispatch } from 'react-redux';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../../common/components/user_privileges/user_privileges_context';

const SPECIAL_TEST_TIMEOUT = 30000;

jest.mock('../../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../../../containers/details', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('../../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));

jest.mock('../../../../../sourcerer/containers/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../../../common/lib/kibana');

jest.mock('../../../../../common/components/user_privileges');

let useTimelineEventsMock = jest.fn();

const loadPageMock = jest.fn();

const mockState = {
  ...structuredClone(mockGlobalState),
};
mockState.timeline.timelineById[TimelineId.test].activeTab = TimelineTabs.eql;

const TestComponent = (props: Partial<ComponentProps<typeof EqlTabContentComponent>>) => {
  const testComponentDefaultProps: ComponentProps<typeof EqlTabContentComponent> = {
    timelineId: TimelineId.test,
    renderCellValue: DefaultCellRenderer,
    rowRenderers: defaultRowRenderers,
  };

  const dispatch = useDispatch();

  useEffect(() => {
    // Unified field list can be a culprit for long load times, so we wait for the timeline to be interacted with to load
    dispatch(timelineActions.showTimeline({ id: TimelineId.test, show: true }));

    // populating timeline so that it is not blank
    dispatch(
      timelineActions.updateEqlOptions({
        id: TimelineId.test,
        field: 'query',
        value: 'any where true',
      })
    );
  }, [dispatch]);

  return <EqlTabContentComponent {...testComponentDefaultProps} {...props} />;
};

describe('EQL Tab', () => {
  const props = {} as EqlTabContentComponentProps;

  beforeAll(() => {
    // https://github.com/atlassian/react-beautiful-dnd/blob/4721a518356f72f1dac45b5fd4ee9d466aa2996b/docs/guides/setup-problem-detection-and-error-recovery.md#disable-logging
    Object.defineProperty(window, '__@hello-pangea/dnd-disable-dev-warnings', {
      get() {
        return true;
      },
    });
  });

  beforeEach(() => {
    useTimelineEventsMock = jest.fn(() => [
      false,
      {
        events: mockTimelineData.slice(0, 1),
        pageInfo: {
          activePage: 0,
          totalPages: 10,
        },
      },
    ]);
    (useTimelineEvents as jest.Mock).mockImplementation(useTimelineEventsMock);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([false, {}]);

    (useIsExperimentalFeatureEnabledMock as jest.Mock).mockImplementation(
      (feature: keyof ExperimentalFeatures) => {
        return allowedExperimentalValues[feature];
      }
    );

    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      notesPrivileges: { read: true },
    });

    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
      } as DOMRect;
    });
  });

  describe('rendering', () => {
    const fetchNotesMock = jest.spyOn(notesApi, 'fetchNotesByDocumentIds');
    test(
      'should render the timeline table',
      async () => {
        fetchNotesMock.mockImplementation(jest.fn());
        render(
          <TestProviders store={createMockStore(mockState)}>
            <TestComponent />
          </TestProviders>
        );

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
      },
      SPECIAL_TEST_TIMEOUT
    );

    test(
      'it renders the timeline column headers',
      async () => {
        render(
          <TestProviders store={createMockStore(mockState)}>
            <TestComponent />
          </TestProviders>
        );

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
      },
      SPECIAL_TEST_TIMEOUT
    );

    test(
      'should render correct placeholder when there are not results',
      async () => {
        (useTimelineEvents as jest.Mock).mockReturnValue([
          false,
          {
            events: [],
            pageInfo: {
              activePage: 0,
              totalPages: 10,
            },
          },
        ]);

        render(
          <TestProviders store={createMockStore(mockState)}>
            <TestComponent />
          </TestProviders>
        );

        expect(await screen.findByText('No results found')).toBeVisible();
      },
      SPECIAL_TEST_TIMEOUT
    );

    // FLAKY: https://github.com/elastic/kibana/issues/224186
    describe.skip('pagination', () => {
      beforeEach(() => {
        // pagination tests need more than 1 record so here
        // we return 5 records instead of just 1.
        useTimelineEventsMock = jest.fn(() => [
          false,
          {
            events: structuredClone(mockTimelineData.slice(0, 5)),
            pageInfo: {
              activePage: 0,
              totalPages: 5,
            },
            refreshedAt: Date.now(),
            /*
             * `totalCount` could be any number w.r.t this test
             * and actually means total hits on elastic search
             * and not the fecthed number of records.
             *
             * This helps in testing `sampleSize` and `loadMore`
             */
            totalCount: 50,
            loadPage: loadPageMock,
          },
        ]);

        (useTimelineEvents as jest.Mock).mockImplementation(useTimelineEventsMock);
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it(
        'should load notes for current page only',
        async () => {
          const mockStateWithNoteInTimeline = {
            ...mockGlobalState,
            timeline: {
              ...mockGlobalState.timeline,
              timelineById: {
                [TimelineId.test]: {
                  ...mockGlobalState.timeline.timelineById[TimelineId.test],
                  /* 1 record for each page */
                  activeTab: TimelineTabs.eql,
                  itemsPerPage: 1,
                  itemsPerPageOptions: [1, 2, 3, 4, 5],
                  savedObjectId: 'timeline-1', // match timelineId in mocked notes data
                  pinnedEventIds: { '1': true },
                },
              },
            },
          };

          render(
            <TestProviders
              store={createMockStore({
                ...structuredClone(mockStateWithNoteInTimeline),
              })}
            >
              <TestComponent {...props} />
            </TestProviders>
          );

          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          expect(screen.getByTestId('pagination-button-previous')).toBeVisible();

          expect(screen.getByTestId('pagination-button-0')).toHaveAttribute('aria-current', 'page');
          expect(fetchNotesMock).toHaveBeenCalledWith(['1']);

          // Page : 2

          fetchNotesMock.mockClear();
          expect(screen.getByTestId('pagination-button-1')).toBeVisible();

          fireEvent.click(screen.getByTestId('pagination-button-1'));

          await waitFor(() => {
            expect(screen.getByTestId('pagination-button-1')).toHaveAttribute(
              'aria-current',
              'page'
            );

            expect(fetchNotesMock).toHaveBeenNthCalledWith(1, [mockTimelineData[1]._id]);
          });

          // Page : 3

          fetchNotesMock.mockClear();
          expect(screen.getByTestId('pagination-button-2')).toBeVisible();
          fireEvent.click(screen.getByTestId('pagination-button-2'));

          await waitFor(() => {
            expect(screen.getByTestId('pagination-button-2')).toHaveAttribute(
              'aria-current',
              'page'
            );

            expect(fetchNotesMock).toHaveBeenNthCalledWith(1, [mockTimelineData[2]._id]);
          });
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should load notes for correct page size',
        async () => {
          const mockStateWithNoteInTimeline = {
            ...mockGlobalState,
            timeline: {
              ...mockGlobalState.timeline,
              timelineById: {
                [TimelineId.test]: {
                  ...mockGlobalState.timeline.timelineById[TimelineId.test],
                  /* 1 record for each page */
                  itemsPerPage: 1,
                  pageIndex: 0,
                  itemsPerPageOptions: [1, 2, 3, 4, 5],
                  savedObjectId: 'timeline-1', // match timelineId in mocked notes data
                  pinnedEventIds: { '1': true },
                },
              },
            },
          };

          render(
            <TestProviders
              store={createMockStore({
                ...structuredClone(mockStateWithNoteInTimeline),
              })}
            >
              <TestComponent {...props} />
            </TestProviders>
          );

          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          expect(screen.getByTestId('pagination-button-previous')).toBeVisible();

          expect(screen.getByTestId('pagination-button-0')).toHaveAttribute('aria-current', 'page');
          expect(screen.getByTestId('tablePaginationPopoverButton')).toHaveTextContent(
            'Rows per page: 1'
          );
          fireEvent.click(screen.getByTestId('tablePaginationPopoverButton'));

          await waitFor(() => {
            expect(screen.getByTestId('tablePagination-2-rows')).toBeVisible();
          });

          fetchNotesMock.mockClear();
          fireEvent.click(screen.getByTestId('tablePagination-2-rows'));

          await waitFor(() => {
            expect(fetchNotesMock).toHaveBeenNthCalledWith(1, [
              mockTimelineData[0]._id,
              mockTimelineData[1]._id,
            ]);
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
    });
  });
});

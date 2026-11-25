/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import QueryTabContent from '.';
import { defaultRowRenderers } from '../../body/renderers';
import { TimelineId } from '../../../../../../common/types/timeline';
import { useTimelineEventsDetails } from '../../../../containers/details';
import {
  createMockStore,
  createSecuritySolutionStorageMock,
  mockGlobalState,
  mockTimelineData,
  TestProviders,
} from '../../../../../common/mock';
import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../../../../types';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDispatch } from 'react-redux-v7';
import type { ExperimentalFeatures } from '../../../../../../common';
import { allowedExperimentalValues } from '../../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import {
  defaultColumnHeaderType,
  defaultUdtHeaders,
} from '../../body/column_headers/default_headers';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../../common/components/user_privileges/__mocks__';
import * as timelineActions from '../../../../store/actions';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { createExpandableFlyoutApiMock } from '../../../../../common/mock/expandable_flyout';
import * as notesApi from '../../../../../notes/api/api';
import { getMockTimelineSearchSubscription } from '../../../../../common/mock/mock_timeline_search_service';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../../data_view_manager/hooks/use_browser_fields';
import { mockBrowserFields } from '../../../../../common/mock/timeline/browser_fields';
import { withIndices } from '../../../../../data_view_manager/hooks/__mocks__/use_data_view';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { UnifiedTimelineBodyProps } from '../../body/unified_timeline_body';
import { UnifiedTimelineBody } from '../../body/unified_timeline_body';

const mockPatterns = [
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
  'journalbeat-*',
];

jest.mock('../../../../../data_view_manager/hooks/use_browser_fields');
jest.mock('../../../../../flyout_v2/use_flyout_api');

jest.mock('../../../../../common/utils/route/use_route_spy', () => {
  return {
    useRouteSpy: jest.fn().mockReturnValue([
      {
        pageName: 'timeline',
      },
    ]),
  };
});

jest.mock('../../../../../common/components/user_privileges');

jest.mock('../../../../containers/details');

jest.mock('../../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));

jest.mock('../../../../../common/hooks/use_experimental_features');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({
    pathname: '',
    search: '',
  })),
}));

const { mockTimelineSearchSubscription } = getMockTimelineSearchSubscription();

const useIsExperimentalFeatureEnabledMock = jest.fn((feature: keyof ExperimentalFeatures) => {
  return allowedExperimentalValues[feature];
});

jest.mock('../../../../../common/lib/kibana');

// unified-field-list is reporting multiple analytics events
jest.mock(`@elastic/ebt/client`);

jest.mock('@kbn/expandable-flyout');

jest.mock('../../body/unified_timeline_body', () => ({
  UnifiedTimelineBody: jest.fn(
    ({ header, events, rowAdditionalLeadingControls }: UnifiedTimelineBodyProps) => (
      <>
        {header}
        {events.map((event, rowIndex) => (
          <div key={event._id}>
            {rowAdditionalLeadingControls?.[0].render(
              () => (
                <></>
              ),
              {
                record: {} as DataTableRecord,
                rowIndex,
              }
            )}
          </div>
        ))}
      </>
    )
  ),
}));

const getUnifiedTimelineBodyProps = () => {
  const props = jest.mocked(UnifiedTimelineBody).mock.lastCall?.[0];
  if (!props) {
    throw new Error('UnifiedTimelineBody was not rendered');
  }
  return props;
};

const TestComponent = (props: Partial<ComponentProps<typeof QueryTabContent>>) => {
  const testComponentDefaultProps: ComponentProps<typeof QueryTabContent> = {
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
      timelineActions.applyKqlFilterQuery({
        id: TimelineId.test,
        filterQuery: {
          kuery: {
            kind: 'kuery',
            expression: '*',
          },
          serializedQuery: '*',
        },
      })
    );
  }, [dispatch]);

  return <QueryTabContent {...testComponentDefaultProps} {...props} />;
};

const customColumnOrder = [
  ...defaultUdtHeaders,
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.severity',
  },
];

const mockBaseState = structuredClone(mockGlobalState);

const mockState: typeof mockGlobalState = {
  ...mockBaseState,
  timeline: {
    ...mockBaseState.timeline,
    timelineById: {
      [TimelineId.test]: {
        ...mockBaseState.timeline.timelineById[TimelineId.test],
        /* 1 record for each page */
        itemsPerPage: 1,
        itemsPerPageOptions: [1, 2, 3, 4, 5],
        /* Returns 1 records in one query */
        sampleSize: 1,
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: 'kuery',
              expression: '*',
            },
            serializedQuery: '*',
          },
        },
      },
    },
  },
};

mockState.timeline.timelineById[TimelineId.test].columns = customColumnOrder;

const TestWrapper: FunctionComponent<React.PropsWithChildren<{}>> = ({ children }) => {
  return <TestProviders store={createMockStore(mockState)}>{children}</TestProviders>;
};

const renderTestComponents = (props?: Partial<ComponentProps<typeof TestComponent>>) => {
  return render(<TestComponent {...props} />, {
    wrapper: TestWrapper,
  });
};

const { storage: storageMock } = createSecuritySolutionStorageMock();

describe('query tab with unified timeline', () => {
  const fetchNotesSpy = jest.spyOn(notesApi, 'fetchNotesByDocumentIds');
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;
  beforeAll(() => {
    fetchNotesSpy.mockImplementation(jest.fn());
    jest.mocked(useExpandableFlyoutApi).mockImplementation(() => createExpandableFlyoutApiMock());

    // https://github.com/atlassian/react-beautiful-dnd/blob/4721a518356f72f1dac45b5fd4ee9d466aa2996b/docs/guides/setup-problem-detection-and-error-recovery.md#disable-logging
    Object.defineProperty(window, '__@hello-pangea/dnd-disable-dev-warnings', {
      get() {
        return true;
      },
    });
  });

  const baseKibanaServicesMock = createStartServicesMock();

  const kibanaServiceMock: StartServices = {
    ...baseKibanaServicesMock,
    storage: storageMock,
    data: {
      ...baseKibanaServicesMock.data,
      search: {
        ...baseKibanaServicesMock.data.search,
        search: mockTimelineSearchSubscription,
      },
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
    storageMock.clear();
    fetchNotesSpy.mockClear();
    cleanup();
    localStorage.clear();
  });

  beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
      } as DOMRect;
    });

    (useKibana as jest.Mock).mockImplementation(() => {
      return {
        services: kibanaServiceMock,
      };
    });

    (useTimelineEventsDetails as jest.Mock).mockImplementation(() => [false, {}]);

    jest.mocked(useDataView).mockReturnValue(withIndices(mockPatterns));

    jest.mocked(useBrowserFields).mockReturnValue(mockBrowserFields);

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      useIsExperimentalFeatureEnabledMock
    );

    (useUserPrivileges as jest.Mock).mockReturnValue(
      getUserPrivilegesMockDefaultValue({
        notesPrivileges: { crud: true, read: true },
        timelinePrivileges: { crud: true, read: true },
        detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
      })
    );

    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });
  describe('render', () => {
    it('should render the timeline header', async () => {
      renderTestComponents();

      expect(await screen.findByTestId('timelineHeader')).toBeVisible();
    });

    it('should hand the body the events of the timeline', async () => {
      renderTestComponents();

      expect(await screen.findByTestId('timelineHeader')).toBeVisible();
      await waitFor(() => {
        expect(getUnifiedTimelineBodyProps().events).toEqual(mockTimelineData.slice(0, 1));
      });
      expect(getUnifiedTimelineBodyProps().itemsPerPage).toBe(1);
    });

    it('should hand the body the columns of the timeline', async () => {
      renderTestComponents();

      expect(await screen.findByTestId('timelineHeader')).toBeVisible();
      const columnIds = getUnifiedTimelineBodyProps().columns?.map(({ id }) => id);
      expect(columnIds).toEqual(expect.arrayContaining(customColumnOrder.map(({ id }) => id)));
    });

    it('should hand the body the row renderers', async () => {
      renderTestComponents();

      expect(await screen.findByTestId('timelineHeader')).toBeVisible();
      expect(getUnifiedTimelineBodyProps().rowRenderers).toBe(defaultRowRenderers);
    });
  });

  describe('pagination', () => {
    const mockStateWithNoteInTimeline = {
      ...mockState,
      timeline: {
        ...mockState.timeline,
        timelineById: {
          [TimelineId.test]: {
            ...mockState.timeline.timelineById[TimelineId.test],
            /* 1 record for each page */
            itemsPerPage: 1,
            itemsPerPageOptions: [1, 2, 3, 4, 5],
            savedObjectId: 'timeline-1', // match timelineId in mocked notes data
            pinnedEventIds: { '1': true },
            /* Returns 3 records */
            sampleSize: 3,
          },
        },
      },
    };

    const renderWithNotes = (itemsPerPage = 1) =>
      render(
        <TestProviders
          store={createMockStore({
            ...structuredClone(mockStateWithNoteInTimeline),
            timeline: {
              ...structuredClone(mockStateWithNoteInTimeline.timeline),
              timelineById: {
                [TimelineId.test]: {
                  ...structuredClone(
                    mockStateWithNoteInTimeline.timeline.timelineById[TimelineId.test]
                  ),
                  itemsPerPage,
                },
              },
            },
          })}
        >
          <TestComponent />
        </TestProviders>
      );

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should load notes for current page only', async () => {
      renderWithNotes();

      expect(await screen.findByTestId('timelineHeader')).toBeVisible();
      await waitFor(() => {
        expect(getUnifiedTimelineBodyProps().events).toHaveLength(3);
      });
      await waitFor(() => {
        expect(fetchNotesSpy).toHaveBeenCalledWith(['1']);
      });

      // Page : 2

      fetchNotesSpy.mockClear();
      act(() => {
        getUnifiedTimelineBodyProps().onUpdatePageIndex?.(1);
      });

      await waitFor(() => {
        expect(fetchNotesSpy).toHaveBeenNthCalledWith(1, [mockTimelineData[1]._id]);
      });
      expect(fetchNotesSpy).toHaveBeenCalledTimes(1);

      // Page : 3

      fetchNotesSpy.mockClear();
      act(() => {
        getUnifiedTimelineBodyProps().onUpdatePageIndex?.(2);
      });

      await waitFor(() => {
        expect(fetchNotesSpy).toHaveBeenNthCalledWith(1, [mockTimelineData[2]._id]);
      });
      expect(fetchNotesSpy).toHaveBeenCalledTimes(1);
    });

    it('should load notes for correct page size', async () => {
      renderWithNotes(2);

      expect(await screen.findByTestId('timelineHeader')).toBeVisible();
      expect(getUnifiedTimelineBodyProps().itemsPerPage).toBe(2);

      await waitFor(() => {
        expect(fetchNotesSpy).toHaveBeenNthCalledWith(1, [
          mockTimelineData[0]._id,
          mockTimelineData[1]._id,
        ]);
      });
    });
  });

  describe('Leading actions - notes', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
        jest.fn((feature: keyof ExperimentalFeatures) => allowedExperimentalValues[feature])
      );
    });

    it('should open the notes flyout', async () => {
      renderTestComponents();
      expect(await screen.findByTestId('timelineHeader')).toBeVisible();

      await waitFor(() => {
        expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

      await waitFor(() => {
        expect(flyoutApi.openNotes).toHaveBeenCalledWith({
          hit: expect.objectContaining({ _id: mockTimelineData[0]._id }),
          origin: FLYOUT_ORIGIN.TIMELINE,
        });
      });
    });
  });

  describe('Leading actions - pin', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
        jest.fn((feature: keyof ExperimentalFeatures) => allowedExperimentalValues[feature])
      );
    });

    it('should disable pinning when event has notes attached in timeline', async () => {
      const mockStateWithNoteInTimeline = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [TimelineId.test]: {
              ...mockState.timeline.timelineById[TimelineId.test],
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
          <TestComponent />
        </TestProviders>
      );

      expect(await screen.findAllByTestId('timeline-pin-event-button')).toHaveLength(1);
      // disabled because it is already pinned
      expect(screen.getByTestId('timeline-pin-event-button')).toBeDisabled();

      fireEvent.mouseOver(screen.getByTestId('timeline-pin-event-button'));

      await waitFor(() => {
        expect(screen.getByTestId('timeline-action-pin-tool-tip')).toBeVisible();
        expect(screen.getByTestId('timeline-action-pin-tool-tip')).toHaveTextContent(
          'This event cannot be unpinned because it has notes in Timeline'
        );
        /*
         * Above event is alert and not an event but `getEventType` in
         * x-pack/solutions/security/plugins/security_solution/public/timelines/components/timeline/body/helpers.tsx
         * returns it has event and not an alert even though, it has event.kind as signal.
         * Need to see if it is okay
         *
         * */
      });
    });

    it('should allow pinning when event has notes but notes are not attached in current timeline', async () => {
      renderTestComponents();

      expect(await screen.findAllByTestId('timeline-pin-event-button')).toHaveLength(1);
      expect(screen.getByTestId('timeline-pin-event-button')).not.toBeDisabled();

      fireEvent.mouseOver(screen.getByTestId('timeline-pin-event-button'));
      await waitFor(() => {
        expect(screen.getByTestId('timeline-action-pin-tool-tip')).toBeVisible();
        expect(screen.getByTestId('timeline-action-pin-tool-tip')).toHaveTextContent('Pin event');
      });
    });
  });
});

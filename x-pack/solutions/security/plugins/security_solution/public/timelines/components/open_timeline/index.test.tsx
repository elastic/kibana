/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useHistory, useParams } from 'react-router-dom';

import '../../../common/mock/formatted_relative';
import { SecurityPageName } from '../../../app/types';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { TimelineId } from '../../../../common/types';
import {
  createMockStore,
  mockGlobalState,
  mockOpenTimelineQueryResults,
  TestProviders,
} from '../../../common/mock';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines_page';
import { getAllTimeline, useGetAllTimeline } from '../../containers/all';

import { useTimelineStatus } from './use_timeline_status';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { StatefulOpenTimeline } from '.';
import { TimelineTabsStyle } from './types';
import { useTimelineTypes } from './use_timeline_types';
import { deleteTimelinesByIds } from '../../containers/api';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import {
  RULE_FROM_EQL_URL_PARAM,
  RULE_FROM_TIMELINE_URL_PARAM,
} from '../../../detections/hooks/use_rule_from_timeline';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
  };
});

const mockQueryTimelineById = jest.fn();

jest.mock('./helpers', () => {
  const originalModule = jest.requireActual('./helpers');
  return {
    ...originalModule,
    useQueryTimelineById: () => mockQueryTimelineById,
  };
});

jest.mock('../../containers/all', () => {
  const originalModule = jest.requireActual('../../containers/all');
  return {
    ...originalModule,
    useGetAllTimeline: jest.fn(),
  };
});
const mockNavigateTo = jest.fn();
const mockNavigateToUrl = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: () => {
      const kibana = actual.useKibana();
      return {
        ...kibana,
        services: {
          ...kibana.services,
          application: { ...kibana.services.application, navigateToUrl: mockNavigateToUrl },
        },
      };
    },
    useNavigation: () => ({
      getAppUrl: jest.fn(),
      navigateTo: mockNavigateTo,
    }),
  };
});

jest.mock('../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineTabsUrl: jest.fn((tabName: string) => `/timelines/${tabName}`),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn((url: string) => url),
      search: 'urlSearch',
    }),
  };
});

jest.mock('./use_timeline_status', () => {
  return {
    useTimelineStatus: jest.fn(),
  };
});

jest.mock('../../containers/api', () => ({
  deleteTimelinesByIds: jest.fn(),
}));

jest.mock('../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('StatefulOpenTimeline', () => {
  const title = 'All Timelines / Open Timelines';
  let mockHistory: History[];
  const mockInstallPrepackagedTimelines = jest.fn();
  const mockFetchAllTimeline = jest.fn();

  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({
      tabName: TimelineTypeEnum.default,
      pageName: SecurityPageName.timelines,
    });
    useUserPrivilegesMock.mockReturnValue({
      timelinePrivileges: { crud: true, read: true },
      notesPrivileges: { crud: true, read: true },
    });
    mockHistory = [];
    (useHistory as jest.Mock).mockReturnValue(mockHistory);
    (useGetAllTimeline as unknown as jest.Mock).mockReturnValue({
      fetchAllTimeline: mockFetchAllTimeline,
      timelines: getAllTimeline('', mockOpenTimelineQueryResults.timeline ?? []),
      loading: false,
      totalCount: mockOpenTimelineQueryResults.totalCount,
      refetch: jest.fn(),
    });
    (useTimelineStatus as unknown as jest.Mock).mockReturnValue({
      timelineStatus: null,
      templateTimelineType: null,
      templateTimelineFilter: <div />,
      installPrepackagedTimelines: mockInstallPrepackagedTimelines,
    });
    mockInstallPrepackagedTimelines.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockHistory = [];
  });

  const renderOpenTimeline = (
    props: Partial<React.ComponentProps<typeof StatefulOpenTimeline>> = {},
    store?: ReturnType<typeof createMockStore>
  ) =>
    render(
      <TestProviders store={store}>
        <StatefulOpenTimeline
          data-test-subj="stateful-timeline"
          isModal={false}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          title={title}
          {...props}
        />
      </TestProviders>
    );

  const getSelectAllCheckbox = (container: HTMLElement) =>
    container.querySelector<HTMLInputElement>('input.euiCheckbox__input') as HTMLInputElement;

  test('it has the expected initial state', () => {
    renderOpenTimeline();

    expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected 0 Timelines');
    expect(screen.getByTestId('selectable-query-text')).toBeEmptyDOMElement();
    expect(screen.getByTestId('only-favorites-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('search-bar')).toHaveValue('');
    expect(document.querySelector('th[aria-sort="descending"]')).toHaveTextContent('Last modified');
    expect(document.querySelector('.euiCommentEvent__headerUsername')).not.toBeInTheDocument();
  });

  describe("Template timelines' tab", () => {
    test("should land on correct timelines' tab with url timelines/default", () => {
      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 0 }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.timelineType).toBe(TimelineTypeEnum.default);
    });

    test("should land on correct timelines' tab with url timelines/template", () => {
      (useParams as jest.Mock).mockReturnValue({
        tabName: TimelineTypeEnum.template,
        pageName: SecurityPageName.timelines,
      });

      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 0 }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.timelineType).toBe(TimelineTypeEnum.template);
    });

    test("should land on correct templates' tab after switching tab", async () => {
      renderOpenTimeline();

      const templatesTab = screen.getByTestId(
        `timeline-${TimelineTabsStyle.tab}-${TimelineTypeEnum.template}`
      );
      expect(templatesTab).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(templatesTab);

      expect(mockNavigateToUrl).toHaveBeenCalledTimes(1);
      expect(mockNavigateToUrl).toHaveBeenCalledWith(`/timelines/${TimelineTypeEnum.template}`);
    });

    test("should selecting correct timelines' filter", () => {
      (useParams as jest.Mock).mockReturnValue({
        tabName: 'mockTabName',
        pageName: SecurityPageName.case,
      });

      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 0 }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.timelineType).toBe(TimelineTypeEnum.default);
    });

    test('should not change url after switching filter', async () => {
      (useParams as jest.Mock).mockReturnValue({
        tabName: 'mockTabName',
        pageName: SecurityPageName.case,
      });

      renderOpenTimeline({ isModal: true });

      await waitFor(() => {
        fireEvent.click(
          screen.getByTestId(
            `open-timeline-modal-body-${TimelineTabsStyle.filter}-${TimelineTypeEnum.template}`
          )
        );
        expect(mockHistory.length).toEqual(0);
      });
    });
  });

  describe('#onQueryChange', () => {
    const enterQuery = async (value: string) => {
      await userEvent.type(screen.getByTestId('search-bar'), `${value}{enter}`);
    };

    test('it updates the query state with the expected trimmed value when the user enters a query', async () => {
      renderOpenTimeline();

      await enterQuery('   abcd   ');

      await waitFor(() => {
        expect(screen.getByTestId('selectable-query-text')).toHaveTextContent('with "abcd"');
      });
      expect(mockFetchAllTimeline).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'abcd' })
      );
    });

    test('it appends the word "with" to the Showing in Timelines message when the user enters a query', async () => {
      renderOpenTimeline();

      await enterQuery('   abcd   ');

      await waitFor(() => {
        expect(screen.getByTestId('query-message')).toHaveTextContent('Showing: 11 timelines with');
      });
    });

    test('echos (renders) the query when the user enters a query', async () => {
      renderOpenTimeline();

      await enterQuery('   abcd   ');

      await waitFor(() => {
        expect(screen.getByTestId('selectable-query-text')).toHaveTextContent(/^with "abcd"$/);
      });
    });
  });

  describe('#focusInput', () => {
    test('focuses the input when the component mounts', async () => {
      const { container } = renderOpenTimeline();

      await waitFor(() => {
        expect(
          container.querySelector<HTMLInputElement>(`.${OPEN_TIMELINE_CLASS_NAME} input`)
        ).toHaveFocus();
      });
    });
  });

  describe('#onAddTimelinesToFavorites', () => {
    // This functionality is hiding for now and waiting to see the light in the near future
    test.skip('it invokes addTimelinesToFavorites with the selected timelines when the button is clicked', async () => {
      const addTimelinesToFavorites = jest.fn();

      const { container } = renderOpenTimeline();

      await waitFor(() => {
        fireEvent.click(getSelectAllCheckbox(container));

        fireEvent.click(screen.getByTestId('favorite-selected'));

        expect(addTimelinesToFavorites).toHaveBeenCalledWith([
          'saved-timeline-11',
          'saved-timeline-10',
          'saved-timeline-9',
          'saved-timeline-8',
          'saved-timeline-6',
          'saved-timeline-5',
          'saved-timeline-4',
          'saved-timeline-3',
          'saved-timeline-2',
        ]);
      });
    });
  });

  describe('#onDeleteSelected', () => {
    test('it invokes deleteTimelines with the selected timelines when the button is clicked', async () => {
      renderOpenTimeline();

      fireEvent.click(screen.getAllByTestId('euiCollapsedItemActionsButton')[0]);
      fireEvent.click(screen.getByTestId('delete-timeline'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(deleteTimelinesByIds).toHaveBeenCalled();
      });
    });
  });

  describe('#onSelectionChange', () => {
    test('it updates the selection state when timelines are selected', async () => {
      const { container } = renderOpenTimeline();

      fireEvent.click(getSelectAllCheckbox(container));

      await waitFor(() => {
        // 13 because we did mock 13 timelines in the query
        expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected 13 Timelines');
      });
    });
  });

  describe('#onTableChange', () => {
    test('it updates the sort state when the user clicks on a column to sort it', () => {
      const { container } = renderOpenTimeline();

      const sortedHeader = () => container.querySelector('th[aria-sort]') as HTMLElement;
      expect(sortedHeader()).toHaveAttribute('aria-sort', 'descending');

      fireEvent.click(container.querySelector('thead tr th button') as HTMLElement);

      expect(container.querySelector('th[aria-sort="ascending"]')).toBeInTheDocument();
      expect(container.querySelector('th[aria-sort="descending"]')).not.toBeInTheDocument();
    });
  });

  describe('#onToggleOnlyFavorites', () => {
    test('it updates the onlyFavorites state when the user clicks the Only Favorites button', () => {
      renderOpenTimeline();

      expect(screen.getByTestId('only-favorites-toggle')).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(screen.getByTestId('only-favorites-toggle'));

      expect(screen.getByTestId('only-favorites-toggle')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('#onToggleShowNotes', () => {
    const mockStateWithTimeline = {
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          ...mockGlobalState.timeline.timelineById,
          [TimelineId.active]: {
            ...mockGlobalState.timeline.timelineById[TimelineId.test],
            noteIds: ['noteId1'],
            createdBy: 'thisisclearlyagapinourtypes',
          },
        },
      },
    };

    test('it updates the itemIdToExpandedNotesRowMap state when the user clicks the expand notes button', async () => {
      const { container } = renderOpenTimeline({}, createMockStore(mockStateWithTimeline));

      expect(container.querySelector('.euiCommentEvent__headerUsername')).not.toBeInTheDocument();

      fireEvent.click(screen.getAllByTestId('expand-notes')[0]);

      await waitFor(() => {
        expect(container.querySelector('.euiCommentEvent__headerUsername')).toBeInTheDocument();
      });
    });

    test('it renders the expanded notes when the expand button is clicked', async () => {
      const { container } = renderOpenTimeline({}, createMockStore(mockStateWithTimeline));

      fireEvent.click(screen.getAllByTestId('expand-notes')[0]);

      await waitFor(() => {
        expect(container.querySelector('.euiCommentEvent__headerUsername')).toHaveTextContent(
          'elastic'
        );
      });
    });

    test('it has the expected initial state for openTimeline - templateTimelineFilter', () => {
      renderOpenTimeline();

      expect(screen.getByTestId('open-timeline-subtabs')).toBeInTheDocument();
    });

    test('it has the expected initial state for openTimelineModalBody - templateTimelineFilter', () => {
      renderOpenTimeline({ isModal: true });

      expect(
        screen.getByTestId(
          `open-timeline-modal-body-${TimelineTabsStyle.filter}-${TimelineTypeEnum.default}`
        )
      ).toBeInTheDocument();
    });
  });

  describe('#resetSelectionState', () => {
    test('when the user deletes selected timelines, resetSelectionState is invoked to clear the selection state', async () => {
      const { container } = renderOpenTimeline();

      expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected 0 Timelines');
      fireEvent.click(getSelectAllCheckbox(container));
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected 13 Timelines');
      });
    });
  });

  test('it renders the expected count of matching timelines when no query has been entered', async () => {
    renderOpenTimeline();

    await waitFor(() => {
      expect(screen.getByTestId('query-message')).toHaveTextContent('Showing: 11 timelines');
    });
  });

  test('it invokes onOpenTimeline with the expected parameters when the hyperlink is clicked', async () => {
    renderOpenTimeline();

    await waitFor(() => {
      fireEvent.click(
        screen.getByTestId(
          `timeline-title-${mockOpenTimelineQueryResults.timeline[0].savedObjectId}`
        )
      );

      expect((mockQueryTimelineById as jest.Mock).mock.calls[0][0].timelineId).toEqual(
        mockOpenTimelineQueryResults.timeline[0].savedObjectId
      );
      expect((mockQueryTimelineById as jest.Mock).mock.calls[0][0].duplicate).toEqual(false);
    });
  });

  test('it invokes onOpenTimeline with the expected params when the button is clicked', async () => {
    renderOpenTimeline();

    fireEvent.click(screen.getAllByTestId('euiCollapsedItemActionsButton')[0]);
    fireEvent.click(screen.getByTestId('open-duplicate'));

    expect((mockQueryTimelineById as jest.Mock).mock.calls[0][0].timelineId).toEqual(
      mockOpenTimelineQueryResults.timeline[0].savedObjectId
    );
    expect((mockQueryTimelineById as jest.Mock).mock.calls[0][0].duplicate).toEqual(true);
  });

  describe('Create rule from timeline', () => {
    const timeline = mockOpenTimelineQueryResults.timeline[0];
    beforeEach(() => {
      const lastTimeline = getAllTimeline('', [timeline])[0];
      (useGetAllTimeline as jest.Mock).mockReturnValue({
        fetchAllTimeline: jest.fn(),
        timelines: [
          {
            ...lastTimeline,
            queryType: {
              hasQuery: true,
              hasEql: true,
            },
          },
        ],
        loading: false,
        totalCount: 1,
        refetch: jest.fn(),
      });
    });
    test('navigates to create rule page with timeline id in URL when Create rule from timeline query click', async () => {
      const { getAllByTestId } = render(
        <TestProviders>
          <StatefulOpenTimeline
            data-test-subj="stateful-timeline"
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </TestProviders>
      );

      fireEvent.click(getAllByTestId('euiCollapsedItemActionsButton')[0]);
      fireEvent.click(getAllByTestId('create-rule-from-timeline')[0]);
      expect(mockNavigateTo.mock.calls[0][0].path).toEqual(
        `?${RULE_FROM_TIMELINE_URL_PARAM}='${timeline?.savedObjectId}'`
      );
    });
    test('navigates to create rule page with timeline id in URL when Create rule from timeline eql click', async () => {
      const { getAllByTestId } = render(
        <TestProviders>
          <StatefulOpenTimeline
            data-test-subj="stateful-timeline"
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </TestProviders>
      );

      fireEvent.click(getAllByTestId('euiCollapsedItemActionsButton')[0]);
      fireEvent.click(getAllByTestId('create-rule-from-eql')[0]);
      expect(mockNavigateTo.mock.calls[0][0].path).toEqual(
        `?${RULE_FROM_EQL_URL_PARAM}='${timeline?.savedObjectId}'`
      );
    });

    test('Does not display Create rule from timeline/eql when no query', async () => {
      const lastTimeline = getAllTimeline('', [timeline])[0];
      (useGetAllTimeline as jest.Mock).mockReturnValue({
        fetchAllTimeline: jest.fn(),
        timelines: [
          {
            ...lastTimeline,
            queryType: {
              hasQuery: false,
              hasEql: false,
            },
          },
        ],
        loading: false,
        totalCount: 1,
        refetch: jest.fn(),
      });
      const { getAllByTestId, queryByTestId } = render(
        <TestProviders>
          <StatefulOpenTimeline
            data-test-subj="stateful-timeline"
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </TestProviders>
      );

      fireEvent.click(getAllByTestId('euiCollapsedItemActionsButton')[0]);
      expect(queryByTestId('create-rule-from-eql')).not.toBeInTheDocument();
      expect(queryByTestId('create-rule-from-timeline')).not.toBeInTheDocument();
    });
  });

  describe('privileges', () => {
    test('installs prepackaged timelines when the user has sufficient privileges', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        timelinePrivileges: { crud: true },
      });
      render(
        <TestProviders>
          <StatefulOpenTimeline
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockInstallPrepackagedTimelines).toHaveBeenCalled();
      });
    });

    test('does not install prepackaged timelines when the user has insufficient privileges', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        timelinePrivileges: { crud: false },
      });
      render(
        <TestProviders>
          <StatefulOpenTimeline
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockInstallPrepackagedTimelines).not.toHaveBeenCalled();
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FC, PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import type QueryTabContent from '.';
import { UnifiedTimeline } from '.';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../containers';
import { useTimelineEventsDetails } from '../../../containers/details';
import { mockSourcererScope } from '../../../../sourcerer/containers/mocks';
import {
  createSecuritySolutionStorageMock,
  mockTimelineData,
  TestProviders,
} from '../../../../common/mock';
import { createMockStore } from '../../../../common/mock/create_store';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { useDispatch } from 'react-redux';
import { timelineActions } from '../../../store';
import type { ExperimentalFeatures } from '../../../../../common';
import { allowedExperimentalValues } from '../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { DataLoadingState } from '@kbn/unified-data-table';
import { getColumnHeaders } from '../body/column_headers/helpers';
import { defaultUdtHeaders } from '../body/column_headers/default_headers';
import type { ColumnHeaderType } from '../../../../../common/types';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

jest.mock('../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../../containers/details');

jest.mock('../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));

jest.mock('../../../../sourcerer/containers/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('../../../../common/lib/kuery');

jest.mock('../../../../common/hooks/use_experimental_features');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({
    pathname: '',
    search: '',
  })),
}));

const useIsExperimentalFeatureEnabledMock = jest.fn((feature: keyof ExperimentalFeatures) => {
  return allowedExperimentalValues[feature];
});

jest.mock('../../../../common/lib/kibana');

// unified-field-list is reporting multiple analytics events
jest.mock(`@elastic/ebt/client`);

const columnsToDisplay = [
  ...defaultUdtHeaders,
  {
    columnHeaderType: 'not-filtered' as ColumnHeaderType,
    id: 'event.severity',
  },
];

// These tests can take more than standard timeout of 5s
// that is why we are increasing the timeout
const SPECIAL_TEST_TIMEOUT = 50000;

const localMockedTimelineData = structuredClone(mockTimelineData);

const mockDataView = new DataView({
  spec: mockSourcererScope.sourcererDataView,
  fieldFormats: fieldFormatsMock,
});

const TestComponent = (
  props: Partial<ComponentProps<typeof UnifiedTimeline>> & { show?: boolean }
) => {
  const { show, ...restProps } = props;
  const testComponentDefaultProps: ComponentProps<typeof QueryTabContent> = {
    columns: getColumnHeaders(columnsToDisplay, mockSourcererScope.browserFields),
    activeTab: TimelineTabs.query,
    dataView: mockDataView,
    rowRenderers: [],
    timelineId: TimelineId.test,
    itemsPerPage: 10,
    itemsPerPageOptions: [],
    sort: [
      {
        columnId: '@timestamp',
        columnType: 'date',
        esTypes: ['date'],
        sortDirection: 'desc',
      },
    ],
    events: localMockedTimelineData,
    refetch: jest.fn(),
    totalCount: localMockedTimelineData.length,
    onFetchMoreRecords: jest.fn(),
    dataLoadingState: DataLoadingState.loaded,
    updatedAt: Date.now(),
    isTextBasedQuery: false,
    onUpdatePageIndex: jest.fn(),
  };

  const dispatch = useDispatch();

  useEffect(() => {
    // Unified field list can be a culprit for long load times, so we wait for the timeline to be interacted with to load
    dispatch(timelineActions.showTimeline({ id: TimelineId.test, show: show ?? true }));

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
  }, [dispatch, show]);

  return <UnifiedTimeline {...testComponentDefaultProps} {...restProps} />;
};

const customStore = createMockStore();

const TestProviderWrapperWithCustomStore: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return <TestProviders store={customStore}>{children}</TestProviders>;
};

const renderTestComponents = (props?: Partial<ComponentProps<typeof TestComponent>>) => {
  return render(<TestComponent {...props} />, {
    wrapper: TestProviderWrapperWithCustomStore,
  });
};

const getTimelineFromStore = (
  store: ReturnType<typeof createMockStore>,
  timelineId: string = TimelineId.test
) => {
  return store.getState().timeline.timelineById[timelineId];
};

const loadPageMock = jest.fn();

const useTimelineEventsMock = jest.fn(() => [
  false,
  {
    events: localMockedTimelineData,
    pageInfo: {
      activePage: 0,
      totalPages: 10,
    },
    refreshedAt: Date.now(),
    totalCount: 70,
    loadPage: loadPageMock,
  },
]);

const { storage: storageMock } = createSecuritySolutionStorageMock();

describe('unified timeline', () => {
  const kibanaServiceMock: StartServices = {
    ...createStartServicesMock(),
    storage: storageMock,
  };

  afterEach(() => {
    jest.clearAllMocks();
    storageMock.clear();
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

    (useTimelineEvents as jest.Mock).mockImplementation(useTimelineEventsMock);

    (useTimelineEventsDetails as jest.Mock).mockImplementation(() => [false, {}]);

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      useIsExperimentalFeatureEnabledMock
    );
  });

  describe('columns', () => {
    it(
      'should move column left correctly ',
      async () => {
        const field = {
          name: 'message',
        };
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toHaveAttribute('data-gridcell-column-index', '4');

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${field.name}`));

        await waitFor(() => {
          expect(screen.getByTitle('Move left')).toBeEnabled();
        });

        fireEvent.click(screen.getByTitle('Move left'));

        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns[0].id).toBe('message');
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should move column right correctly ',
      async () => {
        const field = {
          name: 'message',
        };
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toHaveAttribute('data-gridcell-column-index', '4');

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${field.name}`));

        await waitFor(() => {
          expect(screen.getByTitle('Move right')).toBeEnabled();
        });

        fireEvent.click(screen.getByTitle('Move right'));

        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns[2].id).toBe('message');
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should remove column ',
      async () => {
        const field = {
          name: 'message',
        };
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${field.name}`));

        // column is currently present in the state
        const currentColumns = getTimelineFromStore(customStore).columns;
        expect(currentColumns).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              id: field.name,
            }),
          ])
        );

        await waitFor(() => {
          expect(screen.getByTitle('Remove column')).toBeVisible();
        });

        fireEvent.click(screen.getByTitle('Remove column'));

        // column should now be removed
        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns).not.toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: field.name,
              }),
            ])
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should sort date column',
      async () => {
        const { container } = renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(
          container.querySelector('[data-gridcell-column-id="@timestamp"]')
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-@timestamp'));

        await waitFor(() => {
          expect(screen.getByTitle('Sort Old-New')).toBeVisible();
        });
        expect(screen.getByTitle('Unsort New-Old')).toBeVisible();

        useTimelineEventsMock.mockClear();

        fireEvent.click(screen.getByTitle('Sort Old-New'));

        await waitFor(() => {
          const newSort = getTimelineFromStore(customStore).sort;
          expect(newSort).toMatchObject([
            {
              columnId: '@timestamp',
              columnType: 'date',
              sortDirection: 'asc',
            },
          ]);
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should sort string column correctly',
      async () => {
        const { container } = renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(
          container.querySelector('[data-gridcell-column-id="host.name"]')
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-host.name'));

        await waitFor(() => {
          expect(screen.getByTestId('dataGridHeaderCellActionGroup-host.name')).toBeVisible();
        });

        expect(screen.getByTitle('Sort A-Z')).toBeVisible();
        expect(screen.getByTitle('Sort Z-A')).toBeVisible();

        useTimelineEventsMock.mockClear();

        fireEvent.click(screen.getByTitle('Sort A-Z'));

        await waitFor(() => {
          const newSort = getTimelineFromStore(customStore).sort;
          expect(newSort).toMatchObject([
            {
              columnId: '@timestamp',
              columnType: 'date',
              sortDirection: 'desc',
            },
            {
              sortDirection: 'asc',
              columnId: 'host.name',
              columnType: 'string',
            },
          ]);
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should sort number column',
      async () => {
        const field = {
          name: 'event.severity',
          type: 'number',
        };

        const { container } = renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${field.name}`));

        await waitFor(() => {
          expect(screen.getByTestId(`dataGridHeaderCellActionGroup-${field.name}`)).toBeVisible();
        });

        expect(screen.getByTitle('Sort Low-High')).toBeVisible();
        expect(screen.getByTitle('Sort High-Low')).toBeVisible();

        useTimelineEventsMock.mockClear();

        fireEvent.click(screen.getByTitle('Sort Low-High'));

        await waitFor(() => {
          const newSort = getTimelineFromStore(customStore).sort;
          expect(newSort).toMatchObject([
            {
              columnId: '@timestamp',
              columnType: 'date',
              sortDirection: 'desc',
            },
            {
              sortDirection: 'asc',
              columnId: 'event.severity',
              columnType: 'number',
            },
          ]);
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should be able to edit DataView Field',
      async () => {
        const field = {
          name: 'message',
        };
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toHaveAttribute('data-gridcell-column-index', '4');

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${field.name}`));

        await waitFor(() => {
          expect(screen.getByTitle('Edit data view field')).toBeEnabled();
        });

        fireEvent.click(screen.getByTitle('Edit data view field'));

        await waitFor(() => {
          expect(kibanaServiceMock.dataViewFieldEditor.openEditor).toHaveBeenNthCalledWith(1, {
            ctx: {
              dataView: expect.objectContaining({
                id: 'security-solution',
              }),
            },
            fieldName: 'message',
            onSave: expect.any(Function),
          });
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('unified field list', () => {
    it(
      'should render',
      async () => {
        renderTestComponents();
        expect(await screen.queryByTestId('timeline-sidebar')).toBeInTheDocument();
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should be able to add filters',
      async () => {
        const field = {
          name: 'event.severity',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toBeVisible();
        });

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${field.name}`)).toHaveLength(1);

        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        fireEvent.click(within(availableFields).getByTestId(`field-${field.name}-showDetails`));

        await waitFor(() => {
          expect(screen.getByTestId(`timelineFieldListPanelAddExistFilter-${field.name}`));
        });

        fireEvent.click(screen.getByTestId(`timelineFieldListPanelAddExistFilter-${field.name}`));
        await waitFor(() => {
          expect(
            kibanaServiceMock.timelineDataService.query.filterManager.addFilters
          ).toHaveBeenNthCalledWith(
            1,
            expect.arrayContaining([
              expect.objectContaining({
                query: {
                  exists: {
                    field: field.name,
                  },
                },
                meta: expect.objectContaining({
                  negate: false,
                  disabled: false,
                }),
              }),
            ])
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
    it(
      'should add the column when clicked on + sign',
      async () => {
        const fieldToBeAdded = {
          name: 'agent.id',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toBeVisible();
        });

        expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent('9');

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${fieldToBeAdded.name}`)).toHaveLength(
          0
        );

        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        // / new columns does not exists yet
        const currentColumns = getTimelineFromStore(customStore).columns;
        expect(currentColumns).not.toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              id: fieldToBeAdded.name,
            }),
          ])
        );

        fireEvent.click(within(availableFields).getByTestId(`fieldToggle-${fieldToBeAdded.name}`));

        // new columns should exist now
        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns).toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: fieldToBeAdded.name,
              }),
            ])
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should remove the column when clicked on X sign',
      async () => {
        const fieldToBeRemoved = {
          name: 'event.severity',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toBeVisible();
        });

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${fieldToBeRemoved.name}`)).toHaveLength(
          1
        );

        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        // new columns does exists
        const currentColumns = getTimelineFromStore(customStore).columns;
        expect(currentColumns).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              id: fieldToBeRemoved.name,
            }),
          ])
        );

        fireEvent.click(
          within(availableFields).getByTestId(`fieldToggle-${fieldToBeRemoved.name}`)
        );

        // new columns should not exist now
        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns).not.toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: fieldToBeRemoved.name,
              }),
            ])
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });
});

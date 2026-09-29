/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { HomePage } from '.';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';

import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { inputsActions } from '../../common/store/inputs';
import {
  setAbsoluteRangeDatePicker,
  setRelativeRangeDatePicker,
  setSearchBarFilter,
} from '../../common/store/inputs/actions';
import { coreMock } from '@kbn/core/public/mocks';
import type { Filter } from '@kbn/es-query';
import type { TimeRange, UrlInputsModel } from '../../common/store/inputs/model';
import { SecurityPageName } from '../types';
import type { TimelineUrl } from '../../timelines/store/model';
import { timelineDefaults } from '../../timelines/store/defaults';
import { URL_PARAM_KEY } from '../../common/hooks/use_url_state';
import { InputsModelId } from '../../common/store/inputs/constants';
import { TopValuesPopoverService } from '../components/top_values_popover/top_values_popover_service';

vi.mock('../../common/store/inputs/actions');

const mockRouteSpy = vi.fn().mockReturnValue([{ pageName: 'hosts' }]);

vi.mock('../../common/utils/route/use_route_spy', () => {
  const mocked = {
    useRouteSpy: () => mockRouteSpy(),
  };
  return { ...mocked, default: mocked };
});

const { DummyComponent } = vi.hoisted(() => ({
  DummyComponent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedUseInitializeUrlParam = vi.fn();

const mockUseInitializeUrlParam = (urlParamKey: string, state: unknown) => {
  mockedUseInitializeUrlParam.mockImplementation((key, fn) => {
    if (urlParamKey === key) {
      fn(state);
    }
  });
};

const mockUpdateUrlParam = vi.fn();

vi.mock('../../common/utils/global_query_string', async () => {
  const original = await vi.importActual('../../common/utils/global_query_string');
  return {
    ...original,
    useInitializeUrlParam: (...params: unknown[]) => mockedUseInitializeUrlParam(...params),
    useSyncGlobalQueryString: vi.fn(),
    useUpdateUrlParam: () => mockUpdateUrlParam,
  };
});

vi.mock('../../common/components/drag_and_drop/drag_drop_context_wrapper', () => {
  const mocked = {
    DragDropContextWrapper: DummyComponent,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./template_wrapper', () => {
  const mocked = {
    SecuritySolutionTemplateWrapper: DummyComponent,
  };
  return { ...mocked, default: mocked };
});
const DATE_TIME_NOW = '2020-01-01T00:00:00.000Z';
vi.mock('../../common/components/super_date_picker', () => {
  const mocked = {
    formatDate: (date: string) => DATE_TIME_NOW,
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');
  return {
    ...original,
    useLocation: vi.fn().mockReturnValue({ pathname: '/test', search: '?' }),
  };
});

// HomePage wires up flyoutV2 URL restoration/interop, whose restore logic (including its
// `useEsDocSearch` calls) is covered by dedicated unit tests in `flyout_v2/shared/url_state`.
// Mocked here as no-ops so this suite doesn't need a `UnifiedDocViewerServices` registration.
vi.mock('../../flyout_v2/shared/url_state/use_flyout_v2_restore', () => {
  const mocked = {
    useFlyoutV2RestoreFromUrl: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../flyout_v2/shared/url_state/use_expandable_flyout_url_interop', () => {
  const mocked = {
    useLegacyFlyoutUrlInterop: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockQueryTimelineById = vi.fn();
vi.mock('../../timelines/components/open_timeline/helpers', async () => {
  const original = await vi.importActual('../../timelines/components/open_timeline/helpers');
  return {
    ...original,
    useQueryTimelineById: () => mockQueryTimelineById,
  };
});

const mockGetTimeline = vi.fn();

vi.mock('../../timelines/store', () => {
  const mocked = {
    timelineSelectors: {
      getTimelineByIdSelector: () => mockGetTimeline,
    },
  };
  return { ...mocked, default: mocked };
});

const mockedFilterManager = new FilterManager(coreMock.createStart().uiSettings);
const mockGetSavedQuery = vi.fn();
const mockSetHeaderActionMenu = vi.fn();

const dummyFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'dummy',
    params: {
      query: 'value',
    },
  },
  query: {
    term: {
      dummy: 'value',
    },
  },
};

const mockTopValuesPopoverService = new TopValuesPopoverService();

vi.mock('../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        topValuesPopover: mockTopValuesPopoverService,
        data: {
          ...original.useKibana().services.data,
          dataViews: {
            get: vi
              .fn()
              .mockImplementation(
                async (dataViewId: string, displayErrors?: boolean, refreshFields = false) =>
                  Promise.resolve({
                    id: dataViewId,
                    matchedIndices: refreshFields
                      ? ['hello', 'world', 'refreshed']
                      : ['hello', 'world'],
                    fields: [
                      {
                        name: 'bytes',
                        type: 'number',
                        esTypes: ['long'],
                        aggregatable: true,
                        searchable: true,
                        count: 10,
                        readFromDocValues: true,
                        scripted: false,
                        isMapped: true,
                      },
                      {
                        name: 'ssl',
                        type: 'boolean',
                        esTypes: ['boolean'],
                        aggregatable: true,
                        searchable: true,
                        count: 20,
                        readFromDocValues: true,
                        scripted: false,
                        isMapped: true,
                      },
                      {
                        name: '@timestamp',
                        type: 'date',
                        esTypes: ['date'],
                        aggregatable: true,
                        searchable: true,
                        count: 30,
                        readFromDocValues: true,
                        scripted: false,
                        isMapped: true,
                      },
                    ],
                    getIndexPattern: () => 'hello*,world*,refreshed*',
                    getRuntimeMappings: () => ({
                      myfield: {
                        type: 'keyword',
                      },
                    }),
                  })
              ),
          },
          query: {
            ...original.useKibana().services.data.query,
            filterManager: mockedFilterManager,
            savedQueries: { getSavedQuery: mockGetSavedQuery },
          },
        },
        setHeaderActionMenu: mockSetHeaderActionMenu,
      },
    }),
    KibanaServices: {
      get: vi.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
    },
  };
});

const mockDispatch = vi.fn();

vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseInitializeUrlParam.mockImplementation(vi.fn());
    mockedFilterManager.setFilters([]);
  });

  it('calls useInitializeUrlParam for appQuery, filters and savedQuery', () => {
    render(
      <TestProviders>
        <HomePage>
          <span />
        </HomePage>
      </TestProviders>
    );

    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      URL_PARAM_KEY.appQuery,
      expect.any(Function)
    );
    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      URL_PARAM_KEY.filters,
      expect.any(Function)
    );
    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      URL_PARAM_KEY.savedQuery,
      expect.any(Function)
    );
  });

  it('dispatches setFilterQuery when initializing appQuery', () => {
    const state = { query: 'testQuery', language: 'en' };
    mockUseInitializeUrlParam(URL_PARAM_KEY.appQuery, state);

    render(
      <TestProviders>
        <HomePage>
          <span />
        </HomePage>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      inputsActions.setFilterQuery({
        id: InputsModelId.global,
        query: state.query,
        language: state.language,
      })
    );
  });

  it('initializes saved query store', async () => {
    const state = 'test-query-id';
    const savedQueryData: SavedQuery = {
      id: 'testSavedquery',
      namespaces: ['default'],
      attributes: {
        title: 'testtitle',
        description: 'testDescription',
        query: { query: 'testQuery', language: 'testLanguage' },
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
            },
            query: {},
          },
        ],
      },
    };

    mockGetSavedQuery.mockResolvedValue(savedQueryData);
    mockUseInitializeUrlParam(URL_PARAM_KEY.savedQuery, state);

    render(
      <TestProviders>
        <HomePage>
          <span />
        </HomePage>
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        inputsActions.setSavedQuery({ id: InputsModelId.global, savedQuery: savedQueryData })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        inputsActions.setFilterQuery({
          id: InputsModelId.global,
          ...savedQueryData.attributes.query,
        })
      );
      expect(setSearchBarFilter).toHaveBeenCalledWith({
        id: InputsModelId.global,
        filters: savedQueryData.attributes.filters,
      });
    });
  });

  describe('Filters', () => {
    it('sets filter initial value in the store and filterManager', () => {
      const state = [{ testFilter: 'test' }];
      mockUseInitializeUrlParam(URL_PARAM_KEY.filters, state);
      const spySetFilters = vi.spyOn(mockedFilterManager, 'setFilters');

      render(
        <TestProviders>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(setSearchBarFilter).toHaveBeenCalledWith({
        id: InputsModelId.global,
        filters: state,
      });

      expect(spySetFilters).toHaveBeenCalledWith(state);
    });

    it('sets filter from store when URL param has no value', () => {
      const state = null;
      mockUseInitializeUrlParam(URL_PARAM_KEY.filters, state);
      const spySetAppFilters = vi.spyOn(mockedFilterManager, 'setAppFilters');

      const mockstate = {
        ...mockGlobalState,
        inputs: {
          ...mockGlobalState.inputs,
          global: {
            ...mockGlobalState.inputs.global,
            filters: [dummyFilter],
          },
        },
      };

      const mockStore = createMockStore(mockstate);

      render(
        <TestProviders store={mockStore}>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(spySetAppFilters).toHaveBeenCalledWith([dummyFilter]);
    });

    it('preserves pinned filters when URL param has no value', () => {
      const state = null;
      mockUseInitializeUrlParam(URL_PARAM_KEY.filters, state);
      // pin filter
      mockedFilterManager.setGlobalFilters([dummyFilter]);

      render(
        <TestProviders>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(mockedFilterManager.getFilters()).toEqual([
        {
          ...dummyFilter,
          $state: {
            store: 'globalState',
          },
        },
      ]);
    });
  });

  describe('Timerange', () => {
    it('sets global absolute timerange initial value in the store', () => {
      const timerange: TimeRange = {
        from: '2020-07-07T08:20:18.966Z',
        fromStr: undefined,
        kind: 'absolute',
        to: '2020-07-08T08:20:18.966Z',
        toStr: undefined,
      };

      const state: UrlInputsModel = {
        global: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.timeline],
        },
        timeline: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.global],
        },
        valueReport: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [],
        },
      };

      mockUseInitializeUrlParam(URL_PARAM_KEY.timerange, state);

      render(
        <TestProviders>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(setAbsoluteRangeDatePicker).toHaveBeenCalledWith({
        from: timerange.from,
        to: timerange.to,
        kind: timerange.kind,
        id: InputsModelId.global,
      });

      expect(setAbsoluteRangeDatePicker).toHaveBeenCalledWith({
        from: timerange.from,
        to: timerange.to,
        kind: timerange.kind,
        id: InputsModelId.timeline,
      });
    });

    it('sets updated relative timerange initial value in the store', () => {
      const timerange: TimeRange = {
        from: '2019-01-01T00:00:00.000Z',
        fromStr: 'now-1d/d',
        kind: 'relative',
        to: '2019-01-01T00:00:00.000Z',
        toStr: 'now-1d/d',
      };

      const state: UrlInputsModel = {
        global: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.timeline],
        },
        timeline: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.global],
        },
        valueReport: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [],
        },
      };

      mockUseInitializeUrlParam(URL_PARAM_KEY.timerange, state);

      render(
        <TestProviders>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.global,
      });

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.timeline,
      });
    });

    it('update timerange when navigating to alerts page', () => {
      const timerange: TimeRange = {
        from: '2019-01-01T00:00:00.000Z',
        fromStr: 'now-1d/d',
        kind: 'relative',
        to: '2019-01-01T00:00:00.000Z',
        toStr: 'now-1d/d',
      };

      const mockstate = {
        ...mockGlobalState,
        inputs: {
          ...mockGlobalState.inputs,
          global: {
            ...mockGlobalState.inputs.global,
            timerange,
          },
          timeline: {
            ...mockGlobalState.inputs.timeline,
            timerange,
          },
        },
      };

      const mockStore = createMockStore(mockstate);

      const TestComponent = () => (
        <TestProviders store={mockStore}>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);
      vi.clearAllMocks();

      // simulate page navigation
      mockRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.alerts }]);
      rerender(<TestComponent />);

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.global,
      });

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.timeline,
      });
    });

    it('does not update timerange when navigating to hosts page', () => {
      const timerange: TimeRange = {
        from: '2019-01-01T00:00:00.000Z',
        fromStr: 'now-1d/d',
        kind: 'relative',
        to: '2019-01-01T00:00:00.000Z',
        toStr: 'now-1d/d',
      };

      const mockstate = {
        ...mockGlobalState,
        inputs: {
          ...mockGlobalState.inputs,
          global: {
            ...mockGlobalState.inputs.global,
            timerange,
          },
          timeline: {
            ...mockGlobalState.inputs.timeline,
            timerange,
          },
        },
      };

      const mockStore = createMockStore(mockstate);

      const TestComponent = () => (
        <TestProviders store={mockStore}>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);
      vi.clearAllMocks();

      // simulate page navigation
      mockRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.hosts }]);
      rerender(<TestComponent />);

      expect(setRelativeRangeDatePicker).not.toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.global,
      });

      expect(setRelativeRangeDatePicker).not.toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.timeline,
      });
    });
  });

  describe('Timeline', () => {
    it('initializes Timeline store', () => {
      const timeline: TimelineUrl = {
        id: 'testSavedTimelineId',
        isOpen: false,
      };

      mockUseInitializeUrlParam(URL_PARAM_KEY.timeline, timeline);

      render(
        <TestProviders>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(mockQueryTimelineById).toHaveBeenCalledWith(
        expect.objectContaining({
          timelineId: timeline.id,
          openTimeline: timeline.isOpen,
        })
      );
    });

    it('it keeps timeline visibility and selected tab state in URL', async () => {
      mockUseInitializeUrlParam(URL_PARAM_KEY.timeline, {
        id: 'testSavedTimelineId',
        isOpen: false,
      });

      const TestComponent = () => (
        <TestProviders>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);

      vi.clearAllMocks();
      mockGetTimeline.mockReturnValue({ ...timelineDefaults, savedObjectId: null });

      rerender(<TestComponent />);

      expect(mockUpdateUrlParam).toHaveBeenCalledWith({
        activeTab: 'query',
        isOpen: false,
        query: {
          expression: '',
          kind: 'kuery',
        },
      });
    });

    it('it updates URL when timeline store changes', async () => {
      const savedObjectId = 'testTimelineId';

      mockUseInitializeUrlParam(URL_PARAM_KEY.timeline, {
        id: 'testSavedTimelineId',
        isOpen: false,
      });

      const TestComponent = () => (
        <TestProviders>
          <HomePage>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);

      vi.clearAllMocks();
      mockGetTimeline.mockReturnValue({ ...timelineDefaults, savedObjectId });

      rerender(<TestComponent />);

      expect(mockUpdateUrlParam).toHaveBeenCalledWith(
        expect.objectContaining({ id: savedObjectId })
      );
    });
  });
});

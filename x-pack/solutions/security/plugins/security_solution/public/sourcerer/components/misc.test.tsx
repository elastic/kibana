/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { initialSourcererState, type SelectedDataView, SourcererScopeName } from '../store/model';
import { Sourcerer } from '.';
import { sourcererActions, sourcererModel } from '../store';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { useSourcererDataView } from '../containers';
import { useSignalHelpers } from '../containers/use_signal_helpers';
import { TimelineId } from '../../../common/types/timeline';
import { type TimelineType, TimelineTypeEnum } from '../../../common/api/timeline';
import { sortWithExcludesAtEnd } from '../../../common/utils/sourcerer';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';

const mockDispatch = jest.fn();

jest.mock('../containers');
jest.mock('../containers/use_signal_helpers');
jest.mock('./use_create_adhoc_data_view');
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('@kbn/react-kibana-mount', () => {
  const original = jest.requireActual('@kbn/react-kibana-mount');

  return {
    ...original,
    toMountPoint: jest.fn(),
  };
});

const mockUpdateUrlParam = jest.fn();
jest.mock('../../common/utils/global_query_string', () => {
  const original = jest.requireActual('../../common/utils/global_query_string');

  return {
    ...original,
    useUpdateUrlParam: () => mockUpdateUrlParam,
  };
});

const defaultProps = {
  scope: sourcererModel.SourcererScopeName.default,
};

const checkOptionsAndSelections = (patterns: string[]) => ({
  availableOptionCount:
    screen.queryAllByTestId('List').length > 0 ? screen.queryAllByTestId('List').length : 0,
  optionsSelected: patterns.every(
    (pattern) =>
      screen.getByTestId(`sourcerer-combo-box`).querySelectorAll(`span[title="${pattern}"]`)
        .length === 1
  ),
});

const { id, patternList } = mockGlobalState.sourcerer.defaultDataView;

const patternListNoSignals = sortWithExcludesAtEnd(
  patternList.filter((p) => p !== mockGlobalState.sourcerer.signalIndexName)
);
const sourcererDataView: Partial<SelectedDataView> = {
  indicesExist: true,
  loading: false,
  sourcererDataView: {
    title: 'myFakebeat-*',
  },
};

describe('No data', () => {
  const mockNoIndicesState = {
    ...mockGlobalState,
    sourcerer: {
      ...initialSourcererState,
    },
  };
  let store = createMockStore(mockNoIndicesState);
  const pollForSignalIndexMock = jest.fn();

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      indicesExist: false,
    });
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });
    store = createMockStore(mockNoIndicesState);
    jest.clearAllMocks();
  });

  test('Hide sourcerer - default ', () => {
    render(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryAllByTestId('sourcerer-trigger')).toHaveLength(0);
  });
  test('Hide sourcerer - detections ', () => {
    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.detections} />
      </TestProviders>
    );

    expect(screen.queryAllByTestId('sourcerer-trigger')).toHaveLength(0);
  });
  test('Hide sourcerer - timeline ', () => {
    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    expect(screen.queryAllByTestId('timeline-sourcerer-trigger')).toHaveLength(1);
  });
});

describe('Compat mode', () => {
  const state = {
    ...mockGlobalState,
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '1234',
          title: 'auditbeat-*',
          patternList: ['auditbeat-*'],
        },
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '12347',
          title: 'packetbeat-*',
          patternList: ['packetbeat-*'],
        },
      ],
      sourcererScopes: {
        ...mockGlobalState.sourcerer.sourcererScopes,
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          loading: false,
          patternList,
          selectedDataViewId: null,
          selectedPatterns: ['myFakebeat-*'],
          missingPatterns: ['myFakebeat-*'],
        },
      },
    },
  };
  let store = createMockStore(state);
  const pollForSignalIndexMock = jest.fn();
  beforeEach(() => {
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
    });
    store = createMockStore(state);

    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show Compat mode badge', () => {
    expect(screen.getByText('Compat mode')).toBeInTheDocument();
  });

  test('Show correct tooltip', async () => {
    fireEvent.mouseOver(screen.getByTestId('timeline-sourcerer-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-tooltip').textContent).toBe('myFakebeat-*');
    });
  });
});

describe('Compat mode for timeline template', () => {
  const state = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.active]: {
          ...mockGlobalState.timeline.timelineById.test,
          timelineType: TimelineTypeEnum.template,
        },
      },
    },
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '1234',
          title: 'auditbeat-*',
          patternList: ['auditbeat-*'],
        },
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '12347',
          title: 'packetbeat-*',
          patternList: ['packetbeat-*'],
        },
      ],
      sourcererScopes: {
        ...mockGlobalState.sourcerer.sourcererScopes,
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          loading: false,
          patternList,
          selectedDataViewId: null,
          selectedPatterns: ['myFakebeat-*'],
          missingPatterns: ['myFakebeat-*'],
        },
      },
    },
  };
  let store = createMockStore(state);

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
    });
    store = createMockStore(state);

    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show Compat mode badge', () => {
    expect(screen.getByText('Compat mode')).toBeInTheDocument();
  });
});

describe('Missing index patterns', () => {
  const state = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.active]: {
          ...mockGlobalState.timeline.timelineById.test,
          timelineType: TimelineTypeEnum.template as TimelineType,
        },
      },
    },
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '1234',
          title: 'auditbeat-*',
          patternList: ['auditbeat-*'],
        },
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '12347',
          title: 'packetbeat-*',
          patternList: ['packetbeat-*'],
        },
      ],
      sourcererScopes: {
        ...mockGlobalState.sourcerer.sourcererScopes,
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          loading: false,
          patternList,
          selectedDataViewId: 'fake-data-view-id',
          selectedPatterns: ['myFakebeat-*'],
          missingPatterns: ['myFakebeat-*'],
        },
      },
    },
  };
  let store = createMockStore(state);
  beforeEach(() => {
    const pollForSignalIndexMock = jest.fn();
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show Compat mode badge', async () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
    });
    store = createMockStore(state);

    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    await act(async () => {});

    expect(screen.getByText('Compat mode')).toBeInTheDocument();
  });
});

describe('Sourcerer integration tests', () => {
  const state = {
    ...mockGlobalState,
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '1234',
          title: 'fakebeat-*,neatbeat-*',
          patternList: ['fakebeat-*'],
        },
      ],
      sourcererScopes: {
        ...mockGlobalState.sourcerer.sourcererScopes,
        [SourcererScopeName.default]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
          loading: false,
          selectedDataViewId: id,
          selectedPatterns: patternListNoSignals.slice(0, 2),
        },
      },
    },
  };

  let store = createMockStore(state);
  beforeEach(() => {
    const pollForSignalIndexMock = jest.fn();
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });

    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
    });
    store = createMockStore(state);
    jest.clearAllMocks();
  });

  it('Selects a different index pattern', async () => {
    render(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('sourcerer-trigger'));
    fireEvent.click(screen.getByTestId('sourcerer-select'));

    fireEvent.click(screen.queryAllByTestId('dataView-option-super')[0]);
    expect(checkOptionsAndSelections(['fakebeat-*'])).toEqual({
      availableOptionCount: 0,
      optionsSelected: true,
    });
    fireEvent.click(screen.getByTestId('sourcerer-save'));

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.default,
        selectedDataViewId: '1234',
        selectedPatterns: ['fakebeat-*'],
      })
    );
  });
});

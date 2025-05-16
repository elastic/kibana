/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { GlobalHeader } from '.';
import {
  ADD_DATA_PATH,
  ADD_THREAT_INTELLIGENCE_DATA_PATH,
  SECURITY_FEATURE_ID,
  THREAT_INTELLIGENCE_PATH,
} from '../../../../common/constants';
import {
  createMockStore,
  mockGlobalState,
  mockIndexPattern,
  TestProviders,
} from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { sourcererPaths } from '../../../sourcerer/containers/sourcerer_paths';

import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { DATA_VIEW_PICKER_TEST_ID } from '../../../data_view_manager/components/data_view_picker/constants';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/hooks/use_experimental_features');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../common/lib/kibana');

jest.mock('../../../common/containers/source', () => ({
  useFetchIndex: () => [false, { indicesExist: true, indexPatterns: mockIndexPattern }],
}));

jest.mock('../../../sourcerer/containers/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('react-reverse-portal', () => ({
  InPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OutPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  createHtmlPortalNode: () => ({ unmount: jest.fn() }),
}));

describe('global header', () => {
  const state = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        [TimelineId.active]: {
          ...mockGlobalState.timeline.timelineById.test,
          show: false,
        },
      },
    },
  };
  const store = createMockStore(state);
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      ...mockUseKibana(),
      services: {
        ...mockUseKibana().services,
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
          },
        },
      },
    });
  });
  it('has add data link', () => {
    const { getByText } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );
    expect(getByText('Add integrations')).toBeInTheDocument();
  });

  it('points to the default Add data URL', () => {
    const { queryByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );
    const link = queryByTestId('add-data');
    expect(link?.getAttribute('href')).toBe(ADD_DATA_PATH);
  });

  it('does not show the default Add data URL when hasSearchAILakeConfigurations', () => {
    (useKibana as jest.Mock).mockReturnValue({
      ...mockUseKibana(),
      services: {
        ...mockUseKibana().services,
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: true,
            },
          },
        },
      },
    });
    const { queryByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );
    expect(queryByTestId('add-data')).not.toBeInTheDocument();
  });

  it('points to the threat_intel Add data URL for threat_intelligence url', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: THREAT_INTELLIGENCE_PATH });
    const { queryByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );
    const link = queryByTestId('add-data');
    expect(link?.getAttribute('href')).toBe(ADD_THREAT_INTELLIGENCE_DATA_PATH);
  });

  it.each(sourcererPaths)('shows sourcerer on %s page', (pathname) => {
    (useLocation as jest.Mock).mockReturnValue({ pathname });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );
    expect(getByTestId('sourcerer-trigger')).toBeInTheDocument();
  });

  it('shows sourcerer on rule details page', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[2] });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );
    expect(getByTestId('sourcerer-trigger')).toBeInTheDocument();
  });

  it('shows no sourcerer if timeline is open', () => {
    const mockstate = {
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          [TimelineId.active]: {
            ...mockGlobalState.timeline.timelineById.test,
            show: true,
          },
        },
      },
    };
    const mockStore = createMockStore(mockstate);

    (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[2] });

    const { queryByTestId } = render(
      <TestProviders store={mockStore}>
        <GlobalHeader />
      </TestProviders>
    );

    expect(queryByTestId('sourcerer-trigger')).not.toBeInTheDocument();
  });

  it('shows AI Assistant header link', () => {
    const { findByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );

    waitFor(() => expect(findByTestId('assistantNavLink')).toBeInTheDocument());
  });

  describe('when new data view picker is enabled', () => {
    beforeEach(() => {
      // Mocking location to be alerts page
      (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[0] });
      jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);
    });

    it('should render it instead of sourcerer', () => {
      const { queryByTestId } = render(
        <TestProviders store={store}>
          <GlobalHeader />
        </TestProviders>
      );
      expect(queryByTestId('sourcerer-trigger')).not.toBeInTheDocument();
      expect(queryByTestId(DATA_VIEW_PICKER_TEST_ID)).toBeInTheDocument();
    });
  });
});

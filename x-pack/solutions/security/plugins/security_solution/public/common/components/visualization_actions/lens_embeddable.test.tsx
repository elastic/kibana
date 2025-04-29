/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { screen, render, waitFor } from '@testing-library/react';
import React from 'react';
import type { TablesAdapter } from '@kbn/expressions-plugin/common';

import { createMockStore, mockGlobalState, TestProviders } from '../../mock';
import type { State } from '../../store';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { LensEmbeddable } from './lens_embeddable';
import { useKibana } from '../../lib/kibana';
import { useActions } from './use_actions';
import { useVisualizationResponse } from './use_visualization_response';

const mockActions = [
  { id: 'inspect' },
  { id: 'openInLens' },
  { id: 'addToNewCase' },
  { id: 'addToExistingCase' },
];

const mockSearchSessionId = 'f8b6b4b5-7de2-487c-b81b-0baa3de3378e';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    dispatch: jest.fn(),
  };
});

jest.mock('./use_visualization_response', () => ({
  useVisualizationResponse: jest.fn(() => ({
    searchSessionId: mockSearchSessionId,
    tables: {
      tables: {
        'layer-id-0': {
          meta: {
            statistics: {
              totalCount: 999,
            },
          },
        },
      },
    },
  })),
}));

jest.mock('../../lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});

jest.mock('./use_lens_attributes', () => {
  return {
    useLensAttributes: jest.fn().mockReturnValue('mockAttributes'),
  };
});

jest.mock('./use_actions', () => {
  return {
    useActions: jest.fn(),
  };
});

const useVisualizationResponseMocked = useVisualizationResponse as jest.MockedFunction<
  typeof useVisualizationResponse
>;

describe('LensEmbeddable', () => {
  const state: State = {
    ...mockGlobalState,
    inputs: {
      ...mockGlobalState.inputs,
      global: {
        ...mockGlobalState.inputs.global,
        queries: [
          {
            id: 'testId',
            inspect: { dsl: [], response: ['{"mockResponse": "mockResponse"}'] },
            isInspected: false,
            loading: false,
            selectedInspectIndex: 0,
            searchSessionId: mockSearchSessionId,
            refetch: jest.fn(),
          },
        ],
      },
    },
  };

  const store = createMockStore(state);
  const mockEmbeddableComponent = jest
    .fn()
    .mockReturnValue(<div data-test-subj="embeddableComponent" />);

  (useKibana as jest.Mock).mockReturnValue({
    services: {
      lens: {
        EmbeddableComponent: mockEmbeddableComponent,
      },
      data: {
        actions: {
          createFiltersFromValueClickAction: jest.fn(),
        },
      },
    },
  });
  (useActions as jest.Mock).mockReturnValue(mockActions);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering happy path', () => {
    beforeEach(() => {
      render(
        <TestProviders store={store}>
          <LensEmbeddable
            id="testId"
            lensAttributes={kpiHostMetricLensAttributes}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );
    });

    it('should render LensComponent', () => {
      expect(screen.getByTestId('embeddableComponent')).toBeInTheDocument();
    });

    it('should render actions', () => {
      expect(mockEmbeddableComponent.mock.calls[0][0].extraActions).toEqual(mockActions);
    });

    it('should render with searchSessionId', () => {
      expect(mockEmbeddableComponent.mock.calls[0][0].searchSessionId).toEqual(mockSearchSessionId);
    });

    it('should not sync highlight state between visualizations', () => {
      expect(mockEmbeddableComponent.mock.calls[0][0].syncTooltips).toEqual(false);
      expect(mockEmbeddableComponent.mock.calls[0][0].syncCursor).toEqual(false);
    });

    it('should not render Panel settings action', () => {
      expect(
        mockEmbeddableComponent.mock.calls[0][0].disabledActions.includes('ACTION_CUSTOMIZE_PANEL')
      ).toBeTruthy();
    });
  });

  describe('when no searchSessionId exists', () => {
    it('should not render', () => {
      useVisualizationResponseMocked.mockReturnValue({
        searchSessionId: undefined,
        tables: {
          tables: {
            'layer-id-0': {
              meta: {
                statistics: {
                  totalCount: 999,
                },
              },
            },
          },
        } as unknown as TablesAdapter,
      });

      const { container } = render(
        <TestProviders store={store}>
          <LensEmbeddable
            id="testId"
            lensAttributes={kpiHostMetricLensAttributes}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('when totalCount is 0', () => {
    it('should render no data text', async () => {
      useVisualizationResponseMocked.mockReturnValue({
        searchSessionId: mockSearchSessionId,
        tables: {
          tables: {
            'layer-id-0': {
              meta: {
                statistics: {
                  totalCount: 0,
                },
              },
            },
          },
        } as unknown as TablesAdapter,
      });

      const { container } = render(
        <TestProviders store={store}>
          <LensEmbeddable
            id="testId"
            lensAttributes={kpiHostMetricLensAttributes}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );

      // to syppress act() warning
      await waitFor(() => {
        expect(container.textContent).toBe('No data to display');
      });
    });
  });
});

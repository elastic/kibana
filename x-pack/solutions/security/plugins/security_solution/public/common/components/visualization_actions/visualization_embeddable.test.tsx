/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Store } from 'redux';
import { screen, render, waitFor } from '@testing-library/react';
import type { TablesAdapter } from '@kbn/expressions-plugin/common';

import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { VisualizationEmbeddable } from './visualization_embeddable';
import * as inputActions from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { createMockStore, mockGlobalState, TestProviders } from '../../mock';
import { useRefetchByRestartingSession } from '../page/use_refetch_by_session';

jest.mock('./lens_embeddable');
jest.mock('../page/use_refetch_by_session');

const mockSearchSessionId = 'mockSearchSessionId';
const mockRefetchByRestartingSession = jest.fn();
const mockRefetchByDeletingSession = jest.fn();

const getSpies = () => {
  const mockSetQuery = jest.spyOn(inputActions, 'setQuery');
  const mockDeleteQuery = jest.spyOn(inputActions, 'deleteOneQuery');
  return { mockSetQuery, mockDeleteQuery };
};

const renderWithSpies = (mockStore?: Store) => {
  const { mockSetQuery, mockDeleteQuery } = getSpies();

  const wrapper = render(
    <TestProviders store={mockStore}>
      <VisualizationEmbeddable
        id="testId"
        lensAttributes={kpiHostMetricLensAttributes}
        timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
      />
    </TestProviders>
  );

  return {
    mockSetQuery,
    mockDeleteQuery,
    wrapper,
  };
};

(useRefetchByRestartingSession as jest.Mock).mockReturnValue({
  session: {
    current: {
      start: () => mockSearchSessionId,
    },
  },
  refetchByRestartingSession: mockRefetchByRestartingSession,
  refetchByDeletingSession: mockRefetchByDeletingSession,
});

describe('VisualizationEmbeddable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe('when isDonut = false', () => {
    it('should render LensEmbeddable', async () => {
      renderWithSpies();
      expect(await screen.findByTestId('lens-embeddable')).toBeInTheDocument();
    });

    it('should refetch by delete session when no data exists', async () => {
      const { mockSetQuery } = renderWithSpies();
      await waitFor(() => {
        expect(mockSetQuery).toHaveBeenCalledWith({
          inputId: InputsModelId.global,
          id: 'testId',
          searchSessionId: mockSearchSessionId,
          refetch: mockRefetchByDeletingSession,
          loading: false,
          inspect: null,
        });
      });
    });

    it('should delete query when unmount', () => {
      const { mockDeleteQuery, wrapper } = renderWithSpies();
      wrapper.unmount();
      expect(mockDeleteQuery).toHaveBeenCalledWith({
        inputId: InputsModelId.global,
        id: 'testId',
      });
    });
  });

  describe('when data exists and no there is no searchSessionId', () => {
    const mockState = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          queries: [
            {
              id: 'testId',
              inspect: {
                dsl: [],
                response: [
                  '{\n  "took": 4,\n  "timed_out": false,\n  "_shards": {\n    "total": 3,\n    "successful": 3,\n    "skipped": 2,\n    "failed": 0\n  },\n  "hits": {\n    "total": 21300,\n    "max_score": null,\n    "hits": []\n  },\n  "aggregations": {\n    "0": {\n      "buckets": {\n        "Critical": {\n          "doc_count": 0\n        },\n        "High": {\n          "doc_count": 0\n        },\n        "Low": {\n          "doc_count": 21300\n        },\n        "Medium": {\n          "doc_count": 0\n        }\n      }\n    }\n  }\n}',
                ],
              },
              isInspected: false,
              loading: false,
              selectedInspectIndex: 0,
              searchSessionId: undefined,
              refetch: jest.fn(),
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
            },
          ],
        },
      },
    };

    it('should refetch by restart session', async () => {
      const { mockSetQuery } = renderWithSpies(createMockStore(mockState));
      await waitFor(() => {
        expect(mockSetQuery).toHaveBeenCalledWith({
          inputId: InputsModelId.global,
          id: 'testId',
          searchSessionId: mockSearchSessionId,
          refetch: mockRefetchByRestartingSession,
          loading: false,
          inspect: null,
        });
      });
    });
  });
});

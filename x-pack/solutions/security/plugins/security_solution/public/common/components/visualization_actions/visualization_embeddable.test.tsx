/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { VisualizationEmbeddable } from './visualization_embeddable';
import * as inputActions from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { createMockStore, mockGlobalState, TestProviders } from '../../mock';
import { useRefetchByRestartingSession } from '../page/use_refetch_by_session';
import { getRiskScoreDonutAttributes } from '../../../entity_analytics/lens_attributes/risk_score_donut';

jest.mock('./lens_embeddable');
jest.mock('../page/use_refetch_by_session', () => ({
  useRefetchByRestartingSession: jest.fn(),
}));
jest.useFakeTimers();
let res: RenderResult;
const mockSearchSessionId = 'mockSearchSessionId';
const mockSearchSessionIdDefault = 'mockSearchSessionIdDefault';
const mockRefetchByRestartingSession = jest.fn();
const mockRefetchByDeletingSession = jest.fn();
const mockSetQuery = jest.spyOn(inputActions, 'setQuery');
const mockDeleteQuery = jest.spyOn(inputActions, 'deleteOneQuery');

describe('VisualizationEmbeddable', () => {
  describe('when isDonut = false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useRefetchByRestartingSession as jest.Mock).mockReturnValue({
        session: {
          current: {
            start: jest
              .fn()
              .mockReturnValueOnce(mockSearchSessionId)
              .mockReturnValue(mockSearchSessionIdDefault),
          },
        },
        refetchByRestartingSession: mockRefetchByRestartingSession,
        refetchByDeletingSession: mockRefetchByDeletingSession,
      });
      res = render(
        <TestProviders>
          <VisualizationEmbeddable
            id="testId"
            lensAttributes={kpiHostMetricLensAttributes}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );
    });

    it('should render LensEmbeddable', () => {
      expect(res.getByTestId('lens-embeddable')).toBeInTheDocument();
    });

    it('should refetch by delete session when no data exists', async () => {
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
      res.unmount();
      expect(mockDeleteQuery).toHaveBeenCalledWith({
        inputId: InputsModelId.global,
        id: 'testId',
      });
    });
  });

  describe('when data exists', () => {
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
            },
          ],
        },
      },
    };
    const mockStore = createMockStore(mockState);

    beforeEach(() => {
      jest.clearAllMocks();
      (useRefetchByRestartingSession as jest.Mock).mockReturnValue({
        session: {
          current: {
            start: jest
              .fn()
              .mockReturnValueOnce(mockSearchSessionId)
              .mockReturnValue(mockSearchSessionIdDefault),
          },
        },
        refetchByRestartingSession: mockRefetchByRestartingSession,
        refetchByDeletingSession: mockRefetchByDeletingSession,
      });
      res = render(
        <TestProviders store={mockStore}>
          <VisualizationEmbeddable
            id="testId"
            lensAttributes={kpiHostMetricLensAttributes}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );
    });

    it('should refetch by restart session', async () => {
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

  describe('when isDonut = true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useRefetchByRestartingSession as jest.Mock).mockReturnValue({
        session: {
          current: {
            start: jest
              .fn()
              .mockReturnValueOnce(mockSearchSessionId)
              .mockReturnValue(mockSearchSessionIdDefault),
          },
        },
        refetchByRestartingSession: mockRefetchByRestartingSession,
      });
      res = render(
        <TestProviders>
          <VisualizationEmbeddable
            getLensAttributes={getRiskScoreDonutAttributes}
            id="testId"
            isDonut={true}
            label={'Total'}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );
    });

    it('should render donut wrapper ', () => {
      expect(res.getByTestId('donut-chart')).toBeInTheDocument();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { TestProviders, mockGlobalState } from '../../../../common/mock';
import { createMockStore } from '../../../../common/mock/create_store';
import {
  acknowledgedAlertsVisualizationId,
  closedAlertsVisualizationId,
  openAlertsVisualizationId,
  useAlertsByStatusVisualizationData,
} from './use_alerts_by_status_visualization_data';
import type { TablesAdapter } from '@kbn/expressions-plugin/common';

describe('useAlertsByStatusVisualizationData', () => {
  it('should return visualization alerts count', () => {
    const defaultQueryAttrs = {
      searchSessionId: 'searchSessionId',
      refetch: jest.fn(),
      inspect: { dsl: [], response: ['{"mockResponse": "mockResponse"}'] },
      isInspected: false,
      loading: false,
      selectedInspectIndex: 0,
    };

    const mockStore = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          queries: [
            {
              ...defaultQueryAttrs,
              id: openAlertsVisualizationId,
              tables: {
                tables: {
                  'layer-id-0': {
                    meta: {
                      statistics: {
                        totalCount: 10,
                      },
                    },
                  },
                },
              } as unknown as TablesAdapter,
            },
            {
              ...defaultQueryAttrs,
              id: acknowledgedAlertsVisualizationId,
              tables: {
                tables: {
                  'layer-id-0': {
                    meta: {
                      statistics: {
                        totalCount: 20,
                      },
                    },
                  },
                },
              } as unknown as TablesAdapter,
            },
            {
              ...defaultQueryAttrs,
              id: closedAlertsVisualizationId,
              tables: {
                tables: {
                  'layer-id-0': {
                    meta: {
                      statistics: {
                        totalCount: 30,
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
    const { result } = renderHook(() => useAlertsByStatusVisualizationData(), {
      wrapper: ({ children }) => (
        <TestProviders store={createMockStore(mockStore)}>{children}</TestProviders>
      ),
    });

    expect(result.current.open).toEqual(10);
    expect(result.current.acknowledged).toEqual(20);
    expect(result.current.closed).toEqual(30);
    expect(result.current.total).toEqual(60);
  });
});

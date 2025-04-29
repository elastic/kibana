/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { Datatable } from '@kbn/expressions-plugin/common';

import { TestProviders, mockGlobalState } from '../../../../common/mock';
import { createMockStore } from '../../../../common/mock/create_store';
import {
  acknowledgedAlertsVisualizationId,
  closedAlertsVisualizationId,
  openAlertsVisualizationId,
  useAlertsByStatusVisualizationData,
} from './use_alerts_by_status_visualization_data';

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
                'layer-id-0': {
                  meta: {
                    statistics: {
                      totalCount: 10,
                    },
                  },
                } as unknown as Datatable,
              },
            },
            {
              ...defaultQueryAttrs,
              id: acknowledgedAlertsVisualizationId,
              tables: {
                'layer-id-0': {
                  meta: {
                    statistics: {
                      totalCount: 20,
                    },
                  },
                } as unknown as Datatable,
              },
            },
            {
              ...defaultQueryAttrs,
              id: closedAlertsVisualizationId,
              tables: {
                'layer-id-0': {
                  meta: {
                    statistics: {
                      totalCount: 30,
                    },
                  },
                } as unknown as Datatable,
              },
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

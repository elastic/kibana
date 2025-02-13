/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, mockGlobalState, TestProviders } from '../../mock';
import { useVisualizationResponse } from './use_visualization_response';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { parseVisualizationData } from './utils';

describe('useVisualizationResponse', () => {
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
  const visualizationId = 'testId';
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should get result by visualization id', () => {
    const { result } = renderHook(() => useVisualizationResponse({ visualizationId }), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders store={mockStore}>{children}</TestProviders>
      ),
    });
    expect(result.current.responses).toEqual(
      parseVisualizationData(mockState.inputs.global.queries[0].inspect.response)
    );
  });
});

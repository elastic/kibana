/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThreatsDetectedMetric } from './threats_detected_metric';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getThreatsDetectedMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/threats_detected_metric';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';

// Mock dependencies
jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: jest.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
}));

jest.mock(
  '../../../common/components/visualization_actions/lens_attributes/ai/threats_detected_metric',
  () => ({
    getThreatsDetectedMetricLensAttributes: jest.fn(),
  })
);

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(),
}));

const mockGetThreatsDetectedMetricLensAttributes =
  getThreatsDetectedMetricLensAttributes as jest.MockedFunction<
    typeof getThreatsDetectedMetricLensAttributes
  >;
const mockUseSpaceId = useSpaceId as jest.MockedFunction<typeof useSpaceId>;

const defaultProps = {
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
};

describe('ThreatsDetectedMetric', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseSpaceId.mockReturnValue('test-space-id');
    mockGetThreatsDetectedMetricLensAttributes.mockReturnValue({
      description: '',
      state: {
        adHocDataViews: {},
        datasourceStates: {
          formBased: {
            layers: {
              unifiedHistogram: {
                columnOrder: ['count_column'],
                columns: {
                  count_column: {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Count of records',
                    operationType: 'count',
                    sourceField: '___records___',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          accessor: 'count_column',
          layerId: 'unifiedHistogram',
          layerType: 'data',
        },
      },
      title: 'Threats Detected',
      visualizationType: 'lnsMetric',
      references: [],
    });
  });

  it('calls useSpaceId hook', () => {
    render(<ThreatsDetectedMetric {...defaultProps} />);

    expect(mockUseSpaceId).toHaveBeenCalled();
  });

  it('passes all required props to VisualizationEmbeddable', () => {
    render(<ThreatsDetectedMetric {...defaultProps} />);

    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'threats-detected-metric',
        timerange: {
          from: defaultProps.from,
          to: defaultProps.to,
        },
        id: 'ThreatsDetectedMetricQuery-area-embeddable',
        inspectTitle: 'Real threats detected',
        withActions: [
          VisualizationContextMenuActions.addToExistingCase,
          VisualizationContextMenuActions.addToNewCase,
          VisualizationContextMenuActions.inspect,
        ],
      }),
      {}
    );
  });

  it('passes getLensAttributes function to VisualizationEmbeddable', () => {
    render(<ThreatsDetectedMetric {...defaultProps} />);

    const callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
    expect(callArgs.getLensAttributes).toBeDefined();
    expect(typeof callArgs.getLensAttributes).toBe('function');
  });

  it('getLensAttributes function calls getThreatsDetectedMetricLensAttributes with correct args', () => {
    render(<ThreatsDetectedMetric {...defaultProps} />);

    const callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
    const mockArgs = {
      euiTheme: { colors: {} },
      extraOptions: { filters: [] },
    };

    callArgs.getLensAttributes(mockArgs);

    expect(mockGetThreatsDetectedMetricLensAttributes).toHaveBeenCalledWith({
      ...mockArgs,
      spaceId: 'test-space-id',
    });
  });

  it('handles null/undefined spaceId from useSpaceId hook', () => {
    const testCases = [
      { spaceId: null, description: 'null' },
      { spaceId: undefined, description: 'undefined' },
    ];

    testCases.forEach(({ spaceId }) => {
      jest.clearAllMocks();
      // @ts-ignore
      mockUseSpaceId.mockReturnValue(spaceId);
      mockGetThreatsDetectedMetricLensAttributes.mockReturnValue({
        description: '',
        state: {
          adHocDataViews: {},
          datasourceStates: {
            formBased: {
              layers: {
                unifiedHistogram: {
                  columnOrder: ['count_column'],
                  columns: {
                    count_column: {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Count of records',
                      operationType: 'count',
                      sourceField: '___records___',
                    },
                  },
                  incompleteColumns: {},
                },
              },
            },
          },
          filters: [],
          query: { language: 'kuery', query: '' },
          visualization: {
            accessor: 'count_column',
            layerId: 'unifiedHistogram',
            layerType: 'data',
          },
        },
        title: 'Threats Detected',
        visualizationType: 'lnsMetric',
        references: [],
      });

      render(<ThreatsDetectedMetric {...defaultProps} />);

      const callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
      const mockArgs = {
        euiTheme: { colors: {} },
        extraOptions: { filters: [] },
      };

      callArgs.getLensAttributes(mockArgs);

      expect(mockGetThreatsDetectedMetricLensAttributes).toHaveBeenCalledWith({
        ...mockArgs,
        spaceId: 'default',
      });
    });
  });

  it('handles different time ranges correctly', () => {
    const testCases = [
      {
        from: '2023-01-01T00:00:00.000Z',
        to: '2023-01-02T00:00:00.000Z',
        description: 'single day',
      },
      {
        from: '2023-01-01T00:00:00.000Z',
        to: '2023-12-31T23:59:59.999Z',
        description: 'full year',
      },
    ];

    testCases.forEach(({ from, to, description }) => {
      jest.clearAllMocks();
      mockUseSpaceId.mockReturnValue('test-space-id');
      mockGetThreatsDetectedMetricLensAttributes.mockReturnValue({
        description: '',
        state: {
          adHocDataViews: {},
          datasourceStates: {
            formBased: {
              layers: {
                unifiedHistogram: {
                  columnOrder: ['count_column'],
                  columns: {
                    count_column: {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Count of records',
                      operationType: 'count',
                      sourceField: '___records___',
                    },
                  },
                  incompleteColumns: {},
                },
              },
            },
          },
          filters: [],
          query: { language: 'kuery', query: '' },
          visualization: {
            accessor: 'count_column',
            layerId: 'unifiedHistogram',
            layerType: 'data',
          },
        },
        title: 'Threats Detected',
        visualizationType: 'lnsMetric',
        references: [],
      });

      render(<ThreatsDetectedMetric from={from} to={to} />);

      expect(VisualizationEmbeddable).toHaveBeenCalledWith(
        expect.objectContaining({
          timerange: { from, to },
        }),
        {}
      );
    });
  });

  it('memoizes the component correctly', () => {
    const { rerender } = render(<ThreatsDetectedMetric {...defaultProps} />);

    // Get initial call count
    const initialCallCount = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls.length;

    // Re-render with same props
    rerender(<ThreatsDetectedMetric {...defaultProps} />);

    // Should not call VisualizationEmbeddable again due to memoization
    expect((VisualizationEmbeddable as unknown as jest.Mock).mock.calls.length).toBe(
      initialCallCount
    );

    // Re-render with different props
    rerender(
      <ThreatsDetectedMetric from="2023-02-01T00:00:00.000Z" to="2023-02-28T23:59:59.999Z" />
    );

    // Should call VisualizationEmbeddable again
    expect((VisualizationEmbeddable as unknown as jest.Mock).mock.calls.length).toBe(
      initialCallCount + 1
    );
  });
});

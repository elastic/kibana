/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertFilteringMetric } from './alert_filtering_metric';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getExcludeAlertsFilters } from './utils';
import { getAlertFilteringMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/alert_filtering_metric';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';

jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: jest.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
}));

jest.mock('./utils', () => ({
  getExcludeAlertsFilters: jest.fn(),
}));

jest.mock(
  '../../../common/components/visualization_actions/lens_attributes/ai/alert_filtering_metric',
  () => ({
    getAlertFilteringMetricLensAttributes: jest.fn(),
  })
);

const mockGetExcludeAlertsFilters = getExcludeAlertsFilters as jest.MockedFunction<
  typeof getExcludeAlertsFilters
>;
const mockGetAlertFilteringMetricLensAttributes =
  getAlertFilteringMetricLensAttributes as jest.MockedFunction<
    typeof getAlertFilteringMetricLensAttributes
  >;

const defaultProps = {
  attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  totalAlerts: 1000,
};

describe('AlertFilteringMetric', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetExcludeAlertsFilters.mockReturnValue([
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
        },
        query: {
          bool: {
            must_not: [
              { match_phrase: { 'kibana.alert.uuid': 'alert-1' } },
              { match_phrase: { 'kibana.alert.uuid': 'alert-2' } },
              { match_phrase: { 'kibana.alert.uuid': 'alert-3' } },
            ],
          },
        },
      },
    ]);

    mockGetAlertFilteringMetricLensAttributes.mockReturnValue({
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
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Alert filtering rate',
                    operationType: 'formula',
                    params: {
                      format: { id: 'percent', params: { decimals: 2 } },
                    },
                    references: ['countColumnX1'],
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        internalReferences: [],
        query: { language: 'kuery', query: '_id :*' },
        visualization: {
          icon: 'visLine',
          iconAlign: 'right',
          valuesTextAlign: 'left',
          layerId: 'unifiedHistogram',
          layerType: 'data',
          metricAccessor: 'count_column',
          secondaryTrend: { type: 'none' },
          showBar: false,
        },
      },
      title: 'Alert filtering rate',
      visualizationType: 'lnsMetric',
      references: [],
    });
  });

  it('passes correct props to VisualizationEmbeddable and calls getExcludeAlertsFilters', () => {
    render(<AlertFilteringMetric {...defaultProps} />);

    expect(mockGetExcludeAlertsFilters).toHaveBeenCalledWith(defaultProps.attackAlertIds);
    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'alert-filtering-metric',
        timerange: {
          from: defaultProps.from,
          to: defaultProps.to,
        },
        id: 'AlertFilteringMetricQuery-area-embeddable',
        scopeId: SourcererScopeName.detections,
        withActions: [
          VisualizationContextMenuActions.addToExistingCase,
          VisualizationContextMenuActions.addToNewCase,
          VisualizationContextMenuActions.inspect,
        ],
      }),
      {}
    );
  });

  it('passes correct extraOptions with filters to VisualizationEmbeddable', () => {
    render(<AlertFilteringMetric {...defaultProps} />);

    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        extraOptions: {
          filters: [
            {
              meta: {
                alias: null,
                negate: false,
                disabled: false,
              },
              query: {
                bool: {
                  must_not: [
                    { match_phrase: { 'kibana.alert.uuid': 'alert-1' } },
                    { match_phrase: { 'kibana.alert.uuid': 'alert-2' } },
                    { match_phrase: { 'kibana.alert.uuid': 'alert-3' } },
                  ],
                },
              },
            },
          ],
        },
      }),
      {}
    );
  });

  it('handles getLensAttributes function and calls getAlertFilteringMetricLensAttributes correctly', () => {
    render(<AlertFilteringMetric {...defaultProps} />);

    const callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
    expect(callArgs.getLensAttributes).toBeDefined();
    expect(typeof callArgs.getLensAttributes).toBe('function');
    const mockArgs = {
      euiTheme: { colors: {} },
      extraOptions: { filters: [] },
    };
    callArgs.getLensAttributes(mockArgs);
    expect(mockGetAlertFilteringMetricLensAttributes).toHaveBeenCalledWith({
      ...mockArgs,
      totalAlerts: defaultProps.totalAlerts,
    });
  });

  it('handles empty attackAlertIds correctly', () => {
    const propsWithEmptyIds = { ...defaultProps, attackAlertIds: [] };
    render(<AlertFilteringMetric {...propsWithEmptyIds} />);
    expect(mockGetExcludeAlertsFilters).toHaveBeenCalledWith([]);
  });

  it('handles single attackAlertId correctly', () => {
    const propsWithSingleId = { ...defaultProps, attackAlertIds: ['single-alert-id'] };
    render(<AlertFilteringMetric {...propsWithSingleId} />);
    expect(mockGetExcludeAlertsFilters).toHaveBeenCalledWith(['single-alert-id']);
  });

  it('passes totalAlerts to getLensAttributes function', () => {
    const props = { ...defaultProps, totalAlerts: 1000000 };
    render(<AlertFilteringMetric {...props} />);

    const callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
    const mockArgs = {
      euiTheme: { colors: {} },
      extraOptions: { filters: [] },
    };
    callArgs.getLensAttributes(mockArgs);

    expect(mockGetAlertFilteringMetricLensAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAlerts: 1000000,
      })
    );
  });

  it('memoizes getExcludeAlertsFilters call when props do not change', () => {
    const { rerender } = render(<AlertFilteringMetric {...defaultProps} />);
    jest.clearAllMocks();
    rerender(<AlertFilteringMetric {...defaultProps} />);
    expect(mockGetExcludeAlertsFilters).not.toHaveBeenCalled();
  });

  it('calls getExcludeAlertsFilters when attackAlertIds change', () => {
    const { rerender } = render(<AlertFilteringMetric {...defaultProps} />);
    jest.clearAllMocks();

    const newProps = {
      ...defaultProps,
      attackAlertIds: ['new-alert-1', 'new-alert-2'],
    };
    rerender(<AlertFilteringMetric {...newProps} />);

    expect(mockGetExcludeAlertsFilters).toHaveBeenCalledWith(['new-alert-1', 'new-alert-2']);
  });
});

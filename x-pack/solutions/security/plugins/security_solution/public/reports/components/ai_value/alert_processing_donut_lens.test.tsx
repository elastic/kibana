/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertProcessingDonut } from './alert_processing_donut_lens';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getAlertProcessingDonutAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/alert_processing_donut';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';

jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: jest.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
}));

jest.mock(
  '../../../common/components/visualization_actions/lens_attributes/ai/alert_processing_donut',
  () => ({
    getAlertProcessingDonutAttributes: jest.fn(),
  })
);

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(),
}));

const mockGetAlertProcessingDonutAttributes =
  getAlertProcessingDonutAttributes as jest.MockedFunction<
    typeof getAlertProcessingDonutAttributes
  >;
const mockUseSpaceId = useSpaceId as jest.MockedFunction<typeof useSpaceId>;

const defaultProps = {
  attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
};

describe('AlertProcessingDonut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpaceId.mockReturnValue('test-space-id');

    mockGetAlertProcessingDonutAttributes.mockReturnValue({
      title: 'Alerts',
      description: '',
      visualizationType: 'lnsPie',
      state: {
        visualization: {
          layers: [
            {
              categoryDisplay: 'show',
              colorMapping: {
                assignments: [],
                colorMode: { type: 'categorical' },
                paletteId: 'default',
                specialAssignments: [],
              },
              emptySizeRatio: 0.9,
              layerId: 'unifiedHistogram',
              layerType: 'data',
              legendSize: 'medium',
              legendPosition: 'right',
              legendDisplay: 'hide',
              legendStats: ['percent'],
              metrics: ['count_column'],
              nestedLegend: true,
              numberDisplay: 'percent',
              primaryGroups: ['breakdown_column'],
            },
          ],
          shape: 'donut',
        },
        query: { query: '', language: 'kuery' },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              unifiedHistogram: {
                columnOrder: ['breakdown_column', 'count_column'],
                columns: {
                  breakdown_column: {
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Alert processing category',
                    operationType: 'terms',
                    scale: 'ordinal',
                    sourceField: 'processing_analytics_rtf',
                  },
                  count_column: {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Count of records',
                    operationType: 'count',
                    params: {
                      format: { id: 'number', params: { decimals: 0 } },
                    },
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        internalReferences: [
          {
            id: 'db828b69-bb21-4b92-bc33-56e3b01da790',
            name: 'indexpattern-datasource-layer-unifiedHistogram',
            type: 'index-pattern',
          },
        ],
        adHocDataViews: {
          'db828b69-bb21-4b92-bc33-56e3b01da790': {
            allowHidden: false,
            allowNoIndex: false,
            fieldAttrs: { processing_analytics_rtf: {} },
            fieldFormats: {},
            id: 'db828b69-bb21-4b92-bc33-56e3b01da790',
            name: '.alerts-security.alerts-test-space-id',
            runtimeFieldMap: {
              processing_analytics_rtf: {
                script: { source: 'test script' },
                type: 'keyword',
              },
            },
            sourceFilters: [],
            timeFieldName: '@timestamp',
            title: '.alerts-security.alerts-test-space-id',
          },
        },
      },
      references: [],
    });
  });

  it('calls useSpaceId hook and passes correct props to VisualizationEmbeddable', () => {
    render(<AlertProcessingDonut {...defaultProps} />);

    expect(mockUseSpaceId).toHaveBeenCalled();
    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        applyGlobalQueriesAndFilters: false,
        height: 250,
        width: '100%',
        id: 'open',
        isDonut: true,
        donutTitleLabel: 'Total alerts processed',
        donutTextWrapperClassName: 'donutText',
        scopeId: SourcererScopeName.detections,
        timerange: { from: defaultProps.from, to: defaultProps.to },
        withActions: [
          VisualizationContextMenuActions.addToExistingCase,
          VisualizationContextMenuActions.addToNewCase,
          VisualizationContextMenuActions.inspect,
        ],
        getLensAttributes: expect.any(Function),
      }),
      {}
    );

    const callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
    expect(callArgs.getLensAttributes).toBeDefined();
    expect(typeof callArgs.getLensAttributes).toBe('function');
  });

  it('handles getLensAttributes function calls and various spaceId scenarios correctly', () => {
    render(<AlertProcessingDonut {...defaultProps} />);

    const callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
    const mockArgs = {
      euiTheme: { colors: {} },
      extraOptions: { filters: [] },
    };

    callArgs.getLensAttributes(mockArgs);

    expect(mockGetAlertProcessingDonutAttributes).toHaveBeenCalledWith({
      ...mockArgs,
      attackAlertIds: defaultProps.attackAlertIds,
      spaceId: 'test-space-id',
    });

    const testCases = [null, undefined];
    testCases.forEach((spaceId) => {
      jest.clearAllMocks();
      // @ts-ignore
      mockUseSpaceId.mockReturnValue(spaceId);

      render(<AlertProcessingDonut {...defaultProps} />);

      const newArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
      newArgs.getLensAttributes(mockArgs);

      expect(mockGetAlertProcessingDonutAttributes).toHaveBeenCalledWith({
        ...mockArgs,
        attackAlertIds: defaultProps.attackAlertIds,
        spaceId: 'default',
      });
    });
  });

  it('handles various attackAlertIds scenarios and different spaceId values correctly', () => {
    const mockArgs = {
      euiTheme: { colors: {} },
      extraOptions: { filters: [] },
    };
    const propsWithEmptyIds = { ...defaultProps, attackAlertIds: [] };
    render(<AlertProcessingDonut {...propsWithEmptyIds} />);
    let callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0];
    callArgs.getLensAttributes(mockArgs);
    expect(mockGetAlertProcessingDonutAttributes).toHaveBeenCalledWith({
      ...mockArgs,
      attackAlertIds: [],
      spaceId: 'test-space-id',
    });
    const propsWithSingleId = { ...defaultProps, attackAlertIds: ['single-alert-id'] };
    render(<AlertProcessingDonut {...propsWithSingleId} />);
    callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[1][0];
    callArgs.getLensAttributes(mockArgs);
    expect(mockGetAlertProcessingDonutAttributes).toHaveBeenCalledWith({
      ...mockArgs,
      attackAlertIds: ['single-alert-id'],
      spaceId: 'test-space-id',
    });
    const customSpaceId = 'custom-space-123';
    mockUseSpaceId.mockReturnValue(customSpaceId);
    render(<AlertProcessingDonut {...defaultProps} />);
    callArgs = (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[2][0];
    callArgs.getLensAttributes(mockArgs);
    expect(mockGetAlertProcessingDonutAttributes).toHaveBeenCalledWith({
      ...mockArgs,
      attackAlertIds: defaultProps.attackAlertIds,
      spaceId: customSpaceId,
    });
    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        applyGlobalQueriesAndFilters: false,
        scopeId: SourcererScopeName.detections,
        donutTextWrapperClassName: 'donutText',
        donutTitleLabel: 'Total alerts processed',
        height: 250,
        id: 'open',
        isDonut: true,
        timerange: {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-31T23:59:59.999Z',
        },
        width: '100%',
        withActions: ['addToExistingCase', 'addToNewCase', 'inspect'],
      }),
      {}
    );
  });
});

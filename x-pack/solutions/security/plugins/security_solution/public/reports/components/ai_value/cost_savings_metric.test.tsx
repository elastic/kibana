/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CostSavingsMetric } from './cost_savings_metric';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { useSignalIndexWithDefault } from '../../hooks/use_signal_index_with_default';

// Mock VisualizationEmbeddable
jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: jest.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
}));

jest.mock('../../hooks/use_signal_index_with_default', () => ({
  useSignalIndexWithDefault: jest.fn(),
}));

const defaultProps = {
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  minutesPerAlert: 10,
  analystHourlyRate: 100,
};

const mockUseSignalIndexWithDefault = useSignalIndexWithDefault as jest.MockedFunction<
  typeof useSignalIndexWithDefault
>;

describe('CostSavingsMetric', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSignalIndexWithDefault.mockReturnValue('.alerts-security.alerts-default');
  });

  it('passes correct props to VisualizationEmbeddable', () => {
    render(<CostSavingsMetric {...defaultProps} />);
    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'cost-savings-metric',
        timerange: { from: defaultProps.from, to: defaultProps.to },
        id: expect.stringContaining('CostSavingsMetricQuery-metric'),
        inspectTitle: expect.any(String),
        scopeId: expect.any(String),
        withActions: expect.any(Array),
      }),
      {}
    );
  });

  it('calls useSignalIndexWithDefault hook', () => {
    render(<CostSavingsMetric {...defaultProps} />);
    expect(mockUseSignalIndexWithDefault).toHaveBeenCalled();
  });
});

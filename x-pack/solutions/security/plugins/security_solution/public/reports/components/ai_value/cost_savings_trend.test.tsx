/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CostSavingsTrend } from './cost_savings_trend';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

// Mock VisualizationEmbeddable
jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: jest.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
}));

const defaultProps = {
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  minutesPerAlert: 10,
  analystHourlyRate: 100,
};

describe('CostSavingsTrend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders CostSavingsTrend panel', () => {
    render(<CostSavingsTrend {...defaultProps} />);
    expect(screen.getByTestId('cost-savings-trend-panel')).toBeInTheDocument();
    expect(screen.getByTestId('mock-visualization-embeddable')).toBeInTheDocument();
  });

  it('passes correct props to VisualizationEmbeddable', () => {
    render(<CostSavingsTrend {...defaultProps} />);
    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'embeddable-area-chart',
        getLensAttributes: expect.any(Function),
        timerange: { from: defaultProps.from, to: defaultProps.to },
        id: expect.stringContaining('CostSavingsTrendQuery-area-embeddable'),
        height: 300,
        inspectTitle: expect.any(String),
        scopeId: expect.any(String),
        withActions: expect.any(Array),
      }),
      {}
    );
  });
});

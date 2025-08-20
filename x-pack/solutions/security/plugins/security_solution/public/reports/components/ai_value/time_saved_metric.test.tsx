/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimeSavedMetric } from './time_saved_metric';
import { VisualizationEmbeddable as MockVisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

// Mock VisualizationEmbeddable
jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: jest.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
}));

const defaultProps = {
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-02T00:00:00.000Z',
  minutesPerAlert: 5,
};

describe('TimeSavedMetric', () => {
  it('renders VisualizationEmbeddable with correct props', () => {
    const { getByTestId } = render(<TimeSavedMetric {...defaultProps} />);
    expect(getByTestId('time-saved-metric-container')).toBeInTheDocument();
    expect(getByTestId('mock-visualization-embeddable')).toBeInTheDocument();
  });

  it('passes correct props to VisualizationEmbeddable', () => {
    render(<TimeSavedMetric {...defaultProps} />);
    expect(MockVisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'time-saved-metric',
        timerange: { from: defaultProps.from, to: defaultProps.to },
        id: expect.stringContaining('TimeSavedMetricQuery-metric'),
      }),
      {}
    );
  });
});

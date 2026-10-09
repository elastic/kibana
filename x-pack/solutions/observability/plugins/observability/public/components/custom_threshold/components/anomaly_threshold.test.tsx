/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME } from '@elastic/charts';
import React from 'react';
import { render } from '@testing-library/react';
import type { AnomalyThresholdProps } from './anomaly_threshold';
import { AnomalyThreshold } from './anomaly_threshold';

describe('AnomalyThreshold', () => {
  const defaultProps: AnomalyThresholdProps = {
    chartProps: { baseTheme: LIGHT_THEME },
    id: 'test-anomaly',
    severity: 'Critical',
    severityThreshold: 'Alert when critical or above',
  };

  const renderComponent = (props: Partial<AnomalyThresholdProps> = {}) => {
    return render(
      <div style={{ height: '160px', width: '240px' }}>
        <AnomalyThreshold {...defaultProps} {...props} />
      </div>
    );
  };

  it('renders the component', () => {
    const { queryByTestId } = renderComponent();
    expect(queryByTestId('anomaly-threshold-test-anomaly')).toBeTruthy();
  });

  it('renders with severity threshold', () => {
    const { queryByTestId } = renderComponent({
      severityThreshold: 'Alert when warning or above',
    });
    expect(queryByTestId('anomaly-threshold-test-anomaly')).toBeTruthy();
  });

  it('renders with a custom id', () => {
    const { queryByTestId } = renderComponent({ id: 'latency-anomaly-threshold' });
    expect(queryByTestId('anomaly-threshold-latency-anomaly-threshold')).toBeTruthy();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityAnalyticsRecentAnomalies } from './anomalies_placeholder_panel';
import { TestProviders } from '../../../common/mock';

describe('AnomaliesPlaceholderPanel', () => {
  it('should render the placeholder panel', () => {
    render(
      <TestProviders>
        <EntityAnalyticsRecentAnomalies />
      </TestProviders>
    );

    expect(screen.getByTestId('recent-anomalies-panel')).toBeInTheDocument();
    expect(screen.getByText('Anomaly explorer')).toBeInTheDocument();
  });
});

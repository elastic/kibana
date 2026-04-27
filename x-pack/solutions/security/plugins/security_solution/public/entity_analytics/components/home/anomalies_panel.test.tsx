/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityAnalyticsRecentAnomalies } from './anomalies_panel';
import { TestProviders } from '../../../common/mock';

const MOCK_ML_HREF = '/app/ml/explorer';

jest.mock('@kbn/ml-plugin/public', () => ({
  ...jest.requireActual('@kbn/ml-plugin/public'),
  useMlHref: () => MOCK_ML_HREF,
}));

describe('AnomaliesPanel', () => {
  it('should render the panel', () => {
    render(
      <TestProviders>
        <EntityAnalyticsRecentAnomalies />
      </TestProviders>
    );

    expect(screen.getByTestId('recent-anomalies-panel')).toBeInTheDocument();
    expect(screen.getByText('Recent anomalies')).toBeInTheDocument();
  });

  it('should render the Open in Anomaly Explorer button with a link', () => {
    render(
      <TestProviders>
        <EntityAnalyticsRecentAnomalies />
      </TestProviders>
    );

    const link = screen.getByRole('link', { name: 'Open in Anomaly Explorer' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', MOCK_ML_HREF);
  });
});

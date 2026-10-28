/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DetectionDiscoveryStatus } from './detection_discovery_status';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'YYYY-MM-DD HH:mm',
}));

describe('DetectionDiscoveryStatus', () => {
  it('shows Skipped instead of Processed', () => {
    render(
      <I18nProvider>
        <DetectionDiscoveryStatus
          detection={{ processed: true, skip: { reason: 'still_breaching' } }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftSkippedDetectionBadge')).toHaveTextContent('Skipped');
    expect(screen.queryByText('Processed')).not.toBeInTheDocument();
  });
});

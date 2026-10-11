/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '@kbn/significant-events-plugin/common';
import type { useMaintenanceStatus } from '../hooks/use_significant_events_maintenance';
import { DetectionPausedCallout } from './detection_paused_callout';

let mockMaintenanceStatus: Pick<ReturnType<typeof useMaintenanceStatus>, 'data'> = {
  data: undefined,
};

jest.mock('../hooks/use_significant_events_maintenance', () => ({
  useMaintenanceStatus: () => mockMaintenanceStatus,
}));

const renderCallout = (canManageAndConfigure = true) =>
  render(
    <I18nProvider>
      <DetectionPausedCallout canManageAndConfigure={canManageAndConfigure} />
    </I18nProvider>
  );

describe('DetectionPausedCallout', () => {
  it('matches the Significant Events paused banner copy without a settings action', () => {
    mockMaintenanceStatus = {
      data: {
        state: 'paused',
        updatedBy: 'achyut@elastic.co',
        lastSummary: {
          state: 'paused',
          executionsCancelled: 0,
          workflowsDisabled: 14,
          rulesDisabled: 168,
          partialFailures: [],
        },
      },
    };

    renderCallout();

    const callout = screen.getByTestId('streams-settings-maintenance-paused-status');
    expect(callout).toHaveTextContent('Detection is paused by achyut@elastic.co');
    expect(callout).toHaveTextContent('Nightshift activity is stopped across the deployment');
    expect(callout).toHaveTextContent(
      'Manual triggers are blocked until you resume from Settings.'
    );
    expect(screen.queryByRole('link', { name: 'Open settings' })).not.toBeInTheDocument();
  });

  it('uses read-only wording when the user cannot manage engines', () => {
    mockMaintenanceStatus = {
      data: {
        state: 'paused',
        updatedBy: 'achyut@elastic.co',
      },
    };

    renderCallout(false);

    expect(screen.getByTestId('streams-settings-maintenance-paused-status')).toHaveTextContent(
      'An administrator with the Nightshift Manage engines privilege must resume activity from Settings.'
    );
    expect(screen.queryByRole('link', { name: 'Open settings' })).not.toBeInTheDocument();
  });

  it('keeps automatic pause copy aligned with the Significant Events banner', () => {
    mockMaintenanceStatus = {
      data: { state: 'paused', updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR },
    };

    renderCallout();

    const callout = screen.getByTestId('streams-settings-maintenance-paused-status');
    expect(callout).toHaveTextContent('Paused automatically because Nightshift was turned off');
    expect(callout).toHaveTextContent('Turning Nightshift back on does not resume activity');
  });

  it('does not render while detection activity is enabled', () => {
    mockMaintenanceStatus = {
      data: { state: 'enabled' },
    };

    renderCallout();

    expect(
      screen.queryByTestId('streams-settings-maintenance-paused-status')
    ).not.toBeInTheDocument();
  });
});

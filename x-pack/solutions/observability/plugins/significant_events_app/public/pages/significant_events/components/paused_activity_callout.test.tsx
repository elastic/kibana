/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEventsMaintenanceStatus } from '@kbn/significant-events-plugin/common';
import { PausedActivityCallout } from './paused_activity_callout';

const status: SignificantEventsMaintenanceStatus = {
  state: 'paused',
  updatedBy: 'Elastic',
  lastSummary: {
    state: 'paused',
    executionsCancelled: 0,
    workflowsDisabled: 7,
    rulesDisabled: 2,
    partialFailures: [],
  },
};

describe('PausedActivityCallout', () => {
  it('shows the Settings action to users who can manage and configure', () => {
    render(
      <I18nProvider>
        <PausedActivityCallout
          status={status}
          canManageAndConfigure
          settingsHref="/app/nightshift/settings/detections"
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventsPausedBanner')).toHaveTextContent(
      'Detection is paused by Elastic'
    );
    expect(screen.getByRole('link', { name: 'Open settings' })).toHaveAttribute(
      'href',
      '/app/nightshift/settings/detections'
    );
  });

  it('keeps read-only wording and hides the Settings action', () => {
    render(
      <I18nProvider>
        <PausedActivityCallout
          status={status}
          canManageAndConfigure={false}
          settingsHref="/app/nightshift/settings/detections"
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventsPausedBanner')).toHaveTextContent(
      'An administrator with the Nightshift Manage engines privilege must resume activity'
    );
    expect(screen.queryByRole('link', { name: 'Open settings' })).not.toBeInTheDocument();
  });
});

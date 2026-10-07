/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { PausedActivityCallout } from './paused_activity_callout';

describe('PausedActivityCallout', () => {
  it('matches the settings paused callout copy and links to Settings', () => {
    render(
      <I18nProvider>
        <PausedActivityCallout
          settingsHref="/app/nightshift/settings/detections"
          status={{
            state: 'paused',
            updatedBy: 'kate.sosedova@elastic.co',
            lastSummary: {
              state: 'paused',
              workflowsDisabled: 14,
              rulesDisabled: 168,
              executionsCancelled: 0,
              partialFailures: [],
            },
          }}
        />
      </I18nProvider>
    );

    const callout = screen.getByTestId('significantEventsPausedBanner');
    expect(callout).toHaveTextContent('Detection is paused by kate.sosedova@elastic.co.');
    expect(callout).toHaveTextContent(
      'Detection activity is stopped across the deployment: scheduled discovery, detections and the alerting rules backing knowledge indicator queries. Manual triggers are blocked until you resume from Settings.'
    );

    const settingsButton = screen.getByTestId('significantEventsPausedBannerSettingsLink');
    expect(settingsButton).toHaveTextContent('Open settings');
    expect(settingsButton).toHaveAttribute('href', '/app/nightshift/settings/detections');
  });
});


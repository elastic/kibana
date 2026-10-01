/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ALERTING_V1_ENABLED_SETTING_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  NewAlertsExperienceBanner,
} from './new_alerts_experience_banner';

const NEW_ALERTS_HREF = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`;

const mockGlobalClientSet = jest.fn(() => Promise.resolve());
const mockAddError = jest.fn();
const mockGetUrlForApp = jest.fn(
  (_appId: string, options?: { path?: string }) => `/app/management${options?.path ?? ''}`
);

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
      },
      settings: {
        globalClient: {
          set: mockGlobalClientSet,
        },
      },
      notifications: {
        toasts: {
          addError: mockAddError,
        },
      },
    },
  }),
}));

const renderBanner = () =>
  render(
    <IntlProvider locale="en">
      <NewAlertsExperienceBanner />
    </IntlProvider>
  );

describe('NewAlertsExperienceBanner', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalClientSet.mockResolvedValue(undefined);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: jest.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('renders title, description, and action buttons', () => {
    renderBanner();

    expect(screen.getByText('Try the new Alerts experience')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The new Alerts page brings alerts from Kibana ES|QL alerting, Kibana standard alerting, and external sources into one inbox so you can triage everything in a single place.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('newAlertsExperienceBannerGoToNewButton')).toHaveTextContent(
      'Go to new experience'
    );
    expect(screen.getByTestId('newAlertsExperienceBannerGoToNewButton')).toHaveAttribute(
      'href',
      NEW_ALERTS_HREF
    );
    expect(screen.getByTestId('newAlertsExperienceBannerDisableStandardButton')).toHaveTextContent(
      'Disable this alerts view'
    );
  });

  it('opens a confirmation modal from the disable button', () => {
    renderBanner();

    fireEvent.click(screen.getByTestId('newAlertsExperienceBannerDisableStandardButton'));

    expect(screen.getByTestId('newAlertsExperienceBannerConfirmModal')).toBeInTheDocument();
    expect(screen.getByText('Disable the Standard alerts view?')).toBeInTheDocument();
  });

  it('disables Standard Alerts and navigates to the new Alerts page on confirm', async () => {
    renderBanner();

    fireEvent.click(screen.getByTestId('newAlertsExperienceBannerDisableStandardButton'));
    fireEvent.click(screen.getByText('Disable standard experience'));

    await waitFor(() => {
      expect(mockGlobalClientSet).toHaveBeenCalledWith(ALERTING_V1_ENABLED_SETTING_ID, false);
    });
    expect(window.location.assign).toHaveBeenCalledWith(NEW_ALERTS_HREF);
  });

  it('shows an error toast when disabling fails', async () => {
    const error = new Error('set failed');
    mockGlobalClientSet.mockRejectedValue(error);
    renderBanner();

    fireEvent.click(screen.getByTestId('newAlertsExperienceBannerDisableStandardButton'));
    fireEvent.click(screen.getByText('Disable standard experience'));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(error, {
        title: 'Unable to disable the Standard Alerts view',
      });
    });
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});

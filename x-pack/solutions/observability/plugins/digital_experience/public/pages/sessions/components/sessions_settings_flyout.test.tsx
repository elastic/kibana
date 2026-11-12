/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SessionsSettingsResponse } from '../../../../common/sessions';
import { SessionsSettingsFlyout, frequencyLabel } from './sessions_settings_flyout';

const mockFetch = jest.fn();
// One client for every render, as the real hook memoizes it.
const mockApiClient = { fetch: (...args: unknown[]) => mockFetch(...args) };
jest.mock('../../../hooks/use_api_client', () => ({ useApiClient: () => mockApiClient }));

const GET_ENDPOINT = 'GET /internal/digital_experience/sessions/settings';
const PUT_ENDPOINT = 'PUT /internal/digital_experience/sessions/settings';

const DEFAULTS = { frequency: '1m', concurrency: 2 };

const loaded = (
  settings: Partial<SessionsSettingsResponse['settings']> = {},
  defaults = DEFAULTS
): SessionsSettingsResponse => ({ settings: { ...defaults, ...settings }, defaults });

/** Answers the settings read with `response`, and a save with what it saved over `response`. */
const respondWith = (response: SessionsSettingsResponse | Error) =>
  mockFetch.mockImplementation(
    async (endpoint: string, options?: { params?: { body?: Record<string, unknown> } }) => {
      if (response instanceof Error) {
        throw response;
      }
      if (endpoint === PUT_ENDPOINT) {
        return loaded(options?.params?.body ?? {}, response.defaults);
      }
      return response;
    }
  );

const renderFlyout = () => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  render(<SessionsSettingsFlyout onClose={onClose} onSaved={onSaved} />, {
    wrapper: ({ children }) => (
      <I18nProvider>
        <EuiProvider>{children}</EuiProvider>
      </I18nProvider>
    ),
  });
  return { onClose, onSaved };
};

const frequencySelect = () =>
  screen.findByTestId<HTMLSelectElement>('digitalExperienceSessionsSettingsFrequency');
const concurrencySelect = () =>
  screen.getByTestId<HTMLSelectElement>('digitalExperienceSessionsSettingsConcurrency');
const optionLabels = (select: HTMLSelectElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);
const saveButton = () => screen.getByTestId('digitalExperienceSessionsSettingsSave');

/** As Kibana's HTTP client fails: the status text as the message, the route's in the body. */
const forbidden = (message: string) =>
  Object.assign(new Error('Forbidden'), { body: { statusCode: 403, message } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('frequencyLabel', () => {
  it.each([
    ['30s', 'Every 30 seconds'],
    ['1s', 'Every second'],
    ['1m', 'Every minute'],
    ['90s', 'Every 90 seconds'],
    ['120s', 'Every 2 minutes'],
    ['15m', 'Every 15 minutes'],
    ['60m', 'Every hour'],
  ])('labels %s as %s', (frequency, label) => {
    expect(frequencyLabel(frequency)).toBe(label);
  });
});

describe('SessionsSettingsFlyout', () => {
  it('shows the settings the task runs with, marking the kibana.yml ones as defaults', async () => {
    respondWith(loaded({ frequency: '5m' }));
    renderFlyout();

    const frequency = await frequencySelect();
    expect(frequency.value).toBe('5m');
    expect(optionLabels(frequency)).toEqual([
      'Every 30 seconds',
      'Every minute (default)',
      'Every 2 minutes',
      'Every 5 minutes',
      'Every 15 minutes',
      'Every hour',
    ]);
    expect(concurrencySelect().value).toBe('2');
    expect(optionLabels(concurrencySelect())).toEqual([
      '1 query at a time',
      '2 queries at a time (default)',
      '3 queries at a time',
      '4 queries at a time',
      '5 queries at a time',
      '6 queries at a time',
      '7 queries at a time',
      '8 queries at a time',
    ]);
    expect(screen.getByTestId('digitalExperienceSessionsSettingsFlyout')).toHaveTextContent(
      'Applies to every space'
    );
    expect(mockFetch).toHaveBeenCalledWith(GET_ENDPOINT, { signal: expect.any(AbortSignal) });
  });

  it('offers kibana.yml and saved frequencies that are not among the usual ones, once per duration', async () => {
    respondWith(loaded({ frequency: '90s' }, { frequency: '60s', concurrency: 2 }));
    renderFlyout();

    const frequency = await frequencySelect();
    expect(frequency.value).toBe('90s');
    expect(optionLabels(frequency)).toEqual([
      'Every 30 seconds',
      'Every minute (default)',
      'Every 90 seconds',
      'Every 2 minutes',
      'Every 5 minutes',
      'Every 15 minutes',
      'Every hour',
    ]);
  });

  it('saves the changed settings, leaving out the ones that match kibana.yml', async () => {
    respondWith(loaded({ frequency: '5m' }));
    const { onSaved } = renderFlyout();

    const frequency = await frequencySelect();
    // Nothing changed yet.
    expect(saveButton()).toBeDisabled();
    fireEvent.change(frequency, { target: { value: '1m' } });
    fireEvent.change(concurrencySelect(), { target: { value: '4' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(loaded({ concurrency: 4 })));
    expect(mockFetch).toHaveBeenCalledWith(PUT_ENDPOINT, {
      params: { body: { concurrency: 4 } },
    });
  });

  it('goes back to the kibana.yml settings', async () => {
    respondWith(loaded({ frequency: '15m', concurrency: 6 }));
    const { onSaved } = renderFlyout();

    await frequencySelect();
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsSettingsUseDefaults'));

    expect((await frequencySelect()).value).toBe('1m');
    expect(concurrencySelect().value).toBe('2');
    expect(screen.getByTestId('digitalExperienceSessionsSettingsUseDefaults')).toBeDisabled();
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(loaded()));
    expect(mockFetch).toHaveBeenCalledWith(PUT_ENDPOINT, { params: { body: {} } });
  });

  it('keeps the flyout open with the error when saving fails', async () => {
    respondWith(loaded());
    mockFetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === PUT_ENDPOINT) {
        throw forbidden('Unable to create digital-experience-sessions-settings');
      }
      return loaded();
    });
    const { onSaved } = renderFlyout();

    fireEvent.change(await frequencySelect(), { target: { value: '5m' } });
    fireEvent.click(saveButton());

    expect(
      await screen.findByTestId('digitalExperienceSessionsSettingsSaveError')
    ).toHaveTextContent('Unable to create digital-experience-sessions-settings');
    expect(onSaved).not.toHaveBeenCalled();
    expect(saveButton()).toBeEnabled();
  });

  it('shows a failed read with a retry', async () => {
    respondWith(forbidden('Forbidden'));
    renderFlyout();

    expect(await screen.findByTestId('digitalExperienceSessionsSettingsError')).toHaveTextContent(
      'Could not load the settings'
    );
    respondWith(loaded());
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsSettingsRetry'));

    expect((await frequencySelect()).value).toBe('1m');
  });

  it('closes without saving', async () => {
    respondWith(loaded());
    const { onClose, onSaved } = renderFlyout();

    await frequencySelect();
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsSettingsCancel'));

    expect(onClose).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalledWith(PUT_ENDPOINT, expect.anything());
  });
});

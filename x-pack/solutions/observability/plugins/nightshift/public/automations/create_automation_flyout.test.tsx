/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CreateAutomationFlyout } from './create_automation_flyout';
import { useCreateAutomation } from '../hooks/use_automations';

jest.mock('../hooks/use_automations', () => ({ useCreateAutomation: jest.fn() }));

const mockUseCreateAutomation = useCreateAutomation as jest.Mock;

describe('CreateAutomationFlyout', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockClear();
    mockUseCreateAutomation.mockReturnValue({ mutate, isLoading: false });
  });

  it('requires a name and trims it when creating an automation', async () => {
    render(
      <I18nProvider>
        <CreateAutomationFlyout onClose={jest.fn()} />
      </I18nProvider>
    );

    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
    fireEvent.change(screen.getByTestId('automationName'), {
      target: { value: '  Alert triage  ' },
    });
    expect(screen.getByTestId('submitAutomation')).toBeEnabled();
    fireEvent.click(screen.getByTestId('submitAutomation'));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        {
          name: 'Alert triage',
          trigger: { rows: [{ kind: 'alert' }] },
          execution: {},
          completion: {},
          runtime: { dailyDispatchLimit: 20 },
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });

  it('requires the daily trigger limit to be between 1 and 200', () => {
    render(
      <I18nProvider>
        <CreateAutomationFlyout onClose={jest.fn()} />
      </I18nProvider>
    );

    fireEvent.change(screen.getByTestId('automationName'), { target: { value: 'Alert triage' } });
    const submitButton = screen.getByTestId('submitAutomation');
    const dailyLimit = screen.getByTestId('nightshiftCreateAutomationFlyoutFieldNumber');

    for (const value of ['', '0', '201', '1.5']) {
      fireEvent.change(dailyLimit, { target: { value } });
      expect(submitButton).toBeDisabled();
    }

    fireEvent.change(dailyLimit, { target: { value: '200' } });
    expect(submitButton).toBeEnabled();
  });
});

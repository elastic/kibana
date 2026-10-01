/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CreateAutomationFlyout } from './create_automation_flyout';
import { useCreateAutomation } from '../hooks/use_automations';

jest.mock('../hooks/use_automations', () => ({ useCreateAutomation: jest.fn() }));

const mockUseCreateAutomation = useCreateAutomation as jest.Mock;

const renderFlyout = () =>
  render(
    <I18nProvider>
      <CreateAutomationFlyout onClose={jest.fn()} />
    </I18nProvider>
  );

const addTrigger = async (label: string) => {
  fireEvent.click(screen.getByTestId('automationAddTrigger'));
  fireEvent.click(await screen.findByText(label));
};

const rename = (name: string) => {
  fireEvent.click(screen.getByTestId('automationNameReadMode'));
  fireEvent.change(screen.getByTestId('automationName'), { target: { value: name } });
  fireEvent.keyDown(screen.getByTestId('automationName'), { key: 'Enter' });
};

describe('CreateAutomationFlyout', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockClear();
    mockUseCreateAutomation.mockReturnValue({ mutate, isLoading: false });
  });

  it('requires a trigger before saving', async () => {
    renderFlyout();

    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
    await addTrigger('Alert triggered');
    expect(screen.getByTestId('submitAutomation')).toBeEnabled();
  });

  it('asks for a name instead of saving an untitled automation', async () => {
    renderFlyout();
    await addTrigger('Alert triggered');

    fireEvent.click(screen.getByTestId('submitAutomation'));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('automationName')).toBeInTheDocument();
  });

  it('creates a paused alert automation with tags, instructions, and daily limit', async () => {
    renderFlyout();
    rename('  Alert triage  ');
    fireEvent.click(screen.getByTestId('automationAddTags'));
    const tagInput = within(await screen.findByTestId('automationTagInput')).getByRole('combobox');
    fireEvent.change(tagInput, { target: { value: 'oncall' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    await addTrigger('Alert triggered');
    fireEvent.change(screen.getByTestId('automationInstructions'), {
      target: { value: 'Find the root cause' },
    });

    fireEvent.click(screen.getByTestId('submitAutomation'));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        {
          name: 'Alert triage',
          tags: ['oncall'],
          isEnabled: false,
          trigger: { rows: [{ kind: 'alert' }] },
          execution: { promptTemplate: 'Find the root cause', reasoningMode: 'observe' },
          completion: {},
          runtime: { dailyDispatchLimit: 20 },
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });

  it('blocks saving with an invalid custom cron', async () => {
    renderFlyout();
    await addTrigger('Custom cron…');

    expect(screen.getByTestId('submitAutomation')).toBeEnabled();
    fireEvent.change(screen.getByTestId('automationCronExpression'), {
      target: { value: 'not a cron' },
    });
    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
  });

  it('requires the daily trigger limit to be between 1 and 200', async () => {
    renderFlyout();
    await addTrigger('Alert triggered');
    const submitButton = screen.getByTestId('submitAutomation');
    const dailyLimit = screen.getByTestId('automationDailyLimit');

    for (const value of ['', '0', '201', '1.5']) {
      fireEvent.change(dailyLimit, { target: { value } });
      expect(submitButton).toBeDisabled();
    }

    fireEvent.change(dailyLimit, { target: { value: '200' } });
    expect(submitButton).toBeEnabled();
  });

  it('requires a Slack channel when posting to Slack', async () => {
    renderFlyout();
    await addTrigger('Alert triggered');
    fireEvent.click(screen.getByTestId('automationAddAction'));
    fireEvent.click(await screen.findByTestId('automationAddSlackAction'));

    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
    fireEvent.change(screen.getByTestId('automationSlackDestination'), {
      target: { value: '#oncall' },
    });
    expect(screen.getByTestId('submitAutomation')).toBeEnabled();
  });
});

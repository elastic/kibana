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
import { useCreateAutomation } from '../../hooks/use_automations';

jest.mock('../../hooks/use_automations', () => ({ useCreateAutomation: jest.fn() }));
jest.mock('../../../data/rules/use_rule_catalog', () => ({ useRuleCatalog: () => ({ data: [] }) }));
jest.mock('../../../settings/components/apps_section/use_relay_app_bindings', () => ({
  ...jest.requireActual('../../../settings/components/apps_section/use_relay_app_bindings'),
  useAllRelayAppBindings: () => ({
    bindings: [{ channel: 'C2', displayName: 'oncall', status: 'bound_to_self' }],
    isLoading: false,
    isError: false,
    isComplete: true,
  }),
}));

const mockUseCreateAutomation = useCreateAutomation as jest.Mock;

const onClose = jest.fn();
const onCreated = jest.fn();

const renderFlyout = (props: Partial<React.ComponentProps<typeof CreateAutomationFlyout>> = {}) =>
  render(
    <I18nProvider>
      <CreateAutomationFlyout onClose={onClose} onCreated={onCreated} {...props} />
    </I18nProvider>
  );

const addTag = (tag: string) => {
  const tagInput = within(screen.getByTestId('automationTagInput')).getByRole('combobox');
  fireEvent.change(tagInput, { target: { value: tag } });
  fireEvent.keyDown(tagInput, { key: 'Enter' });
};

const addTrigger = async (label: string) => {
  fireEvent.click(screen.getByTestId('automationAddTrigger'));
  fireEvent.click(await screen.findByText(label));
};

const rename = (name: string) => {
  fireEvent.change(screen.getByTestId('automationName'), { target: { value: name } });
};

describe('CreateAutomationFlyout', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockClear();
    onClose.mockClear();
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
    expect(screen.getByTestId('automationName')).toBeInvalid();
  });

  it('creates a disabled alert automation with tags, instructions, and daily limit', async () => {
    renderFlyout();
    rename('  Alert triage  ');
    addTag('oncall');
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
          execution: { promptTemplate: 'Find the root cause', reasoningMode: 'investigate' },
          completions: [],
          runtime: { dailyDispatchLimit: 20 },
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
    mutate.mock.calls[0][1].onSuccess({ id: 'created-1' });
    expect(onCreated).toHaveBeenCalledWith('created-1');
  });

  it('requires instructions for a scheduled automation', async () => {
    renderFlyout();
    await addTrigger('Every…');
    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
    const instructions = screen.getByTestId('automationInstructions');
    expect(instructions).toHaveAttribute('maxlength', '5000');
    fireEvent.change(instructions, {
      target: { value: 'Review checkout errors over the last hour.' },
    });
    expect(screen.getByTestId('submitAutomation')).toBeEnabled();
    fireEvent.change(instructions, { target: { value: '   ' } });
    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
  });

  it('requires the daily trigger limit to be between 1 and 50', async () => {
    renderFlyout();
    await addTrigger('Alert triggered');
    const submitButton = screen.getByTestId('submitAutomation');
    const dailyLimit = screen.getByTestId('automationDailyLimit');

    for (const value of ['', '0', '51', '1.5']) {
      fireEvent.change(dailyLimit, { target: { value } });
      expect(submitButton).toBeDisabled();
    }

    fireEvent.change(dailyLimit, { target: { value: '50' } });
    expect(submitButton).toBeEnabled();
  });

  it('requires a Slack channel when posting to Slack', async () => {
    renderFlyout();
    await addTrigger('Alert triggered');
    fireEvent.click(screen.getByTestId('automationAddAction'));
    fireEvent.click(await screen.findByTestId('automationAddSlackAction'));

    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
    const channelInput = within(screen.getByTestId('automationSlackChannelDestination')).getByRole(
      'combobox'
    );
    fireEvent.change(channelInput, { target: { value: 'oncall' } });
    fireEvent.click(await screen.findByRole('option', { name: '#oncall' }));
    expect(screen.getByTestId('submitAutomation')).toBeEnabled();
  });

  it('closes a pristine form without confirmation', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });

  it('confirms before discarding unsaved changes', () => {
    renderFlyout();
    rename('Alert triage');

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Alert triage has not been saved. If you leave now, this draft will be discarded.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Keep editing'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    fireEvent.click(screen.getByText('Discard'));
    expect(onClose).toHaveBeenCalled();
  });

  it('enables the automation with Save and enable', async () => {
    renderFlyout();
    rename('Alert triage');
    await addTrigger('Alert triggered');

    fireEvent.click(screen.getByTestId('submitAndEnableAutomation'));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: true }),
      expect.anything()
    );
  });
});

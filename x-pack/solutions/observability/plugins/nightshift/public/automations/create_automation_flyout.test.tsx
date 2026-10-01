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

const onClose = jest.fn();

const renderFlyout = (props: Partial<React.ComponentProps<typeof CreateAutomationFlyout>> = {}) =>
  render(
    <I18nProvider>
      <CreateAutomationFlyout onClose={onClose} {...props} />
    </I18nProvider>
  );

const addTag = async (tag: string) => {
  fireEvent.click(screen.getByTestId('automationAddTags'));
  const tagInput = within(await screen.findByTestId('automationTagInput')).getByRole('combobox');
  fireEvent.change(tagInput, { target: { value: tag } });
  fireEvent.keyDown(tagInput, { key: 'Enter' });
};

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
    expect(screen.getByTestId('automationName')).toBeInTheDocument();
  });

  it('creates a paused alert automation with tags, instructions, and daily limit', async () => {
    renderFlyout();
    rename('  Alert triage  ');
    await addTag('oncall');
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

  it('ignores duplicate tags and removes tags', async () => {
    renderFlyout();
    await addTag('oncall');
    await addTag('OnCall');

    expect(screen.getAllByText('oncall')).toHaveLength(1);
    expect(screen.getByTestId('automationAddTags')).toHaveTextContent('Add tag');
    fireEvent.click(screen.getByLabelText('Remove tag oncall'));
    expect(screen.queryByText('oncall')).not.toBeInTheDocument();
    expect(screen.getByTestId('automationAddTags')).toHaveTextContent('Add tags');
  });

  it('renames the automation in place and reverts on Escape', () => {
    renderFlyout();

    expect(screen.getByTestId('automationNameReadMode')).toHaveTextContent('Untitled automation');
    rename('Alert triage');
    expect(screen.getByTestId('automationNameReadMode')).toHaveTextContent('Alert triage');

    fireEvent.click(screen.getByTestId('automationNameReadMode'));
    fireEvent.change(screen.getByTestId('automationName'), { target: { value: 'Other' } });
    fireEvent.keyDown(screen.getByTestId('automationName'), { key: 'Escape' });
    expect(screen.getByTestId('automationNameReadMode')).toHaveTextContent('Alert triage');
  });

  it('opens the title editor from the footer Rename action', async () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('automationFlyoutActions'));
    fireEvent.click(await screen.findByText('Rename'));

    expect(screen.getByTestId('automationName')).toBeInTheDocument();
  });

  it('closes a pristine draft without confirmation', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });

  it('confirms before discarding unsaved changes', async () => {
    renderFlyout();
    rename('Alert triage');

    fireEvent.click(screen.getByTestId('automationFlyoutActions'));
    fireEvent.click(await screen.findByText('Discard draft'));

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

  it('activates the automation on save when the switch is on', async () => {
    renderFlyout();
    rename('Alert triage');
    await addTrigger('Alert triggered');

    expect(screen.getByText('Saves as paused')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('automationEnabledSwitch'));
    expect(screen.getByText('Activates when saved')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('submitAutomation'));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: true }),
      expect.anything()
    );
  });

  it('prefills the form from a cloned automation', () => {
    renderFlyout({
      automation: {
        id: 'automation-1',
        name: 'Triage',
        tags: ['oncall'],
        description: 'Triage alerts',
        automationType: 'custom',
        isEnabled: true,
        trigger: { rows: [{ kind: 'alert', alertStatus: 'active' }] },
        execution: { promptTemplate: 'Find the cause', reasoningMode: 'investigate' },
        completion: {},
        runtime: { dailyDispatchLimit: 5 },
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        author: { username: 'elastic' },
      },
    });

    expect(screen.getByTestId('automationNameReadMode')).toHaveTextContent('Triage');
    expect(screen.getByText('oncall')).toBeInTheDocument();
    expect(screen.getByTestId('automationDescription')).toHaveValue('Triage alerts');
    expect(screen.getByTestId('automationStatusPicker')).toHaveTextContent('Active');
    expect(screen.getByTestId('automationDailyLimit')).toHaveValue(5);
    expect(screen.getByTestId('automationInstructions')).toHaveValue('Find the cause');
    expect(screen.getByTestId('automationInstructionMode')).toHaveTextContent('Investigate');
  });
});

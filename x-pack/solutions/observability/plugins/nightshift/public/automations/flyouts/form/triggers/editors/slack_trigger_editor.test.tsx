/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  createTriggerFormValues,
  type SlackTriggerFormValues,
  type SlackTriggerKind,
} from '../../automation_form_values';
import { SlackTriggerEditor } from './slack_trigger_editor';

const connected = {
  bindings: [
    { channel: 'C1', displayName: 'alerts', status: 'bound_to_self' as const },
    { channel: 'C2', displayName: 'oncall', status: 'bound_to_self' as const },
  ],
  isLoading: false,
  isError: false,
  isComplete: true,
};
const mockUseAllRelayAppBindings = jest.fn();
jest.mock('../../../../../settings/components/apps_section/use_relay_app_bindings', () => ({
  ...jest.requireActual('../../../../../settings/components/apps_section/use_relay_app_bindings'),
  useAllRelayAppBindings: () => mockUseAllRelayAppBindings(),
}));
jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { application: { getUrlForApp: () => '/app/nightshift/settings/general' } },
  }),
}));

const onChange = jest.fn();

const Editor = ({
  kind,
  initialChannels = [],
}: {
  kind: SlackTriggerKind;
  initialChannels?: string[];
}) => {
  const [trigger, setTrigger] = useState({
    ...(createTriggerFormValues(kind) as SlackTriggerFormValues),
    channels: initialChannels,
  });
  return (
    <I18nProvider>
      <SlackTriggerEditor
        trigger={trigger}
        onChange={(next) => {
          onChange(next);
          setTrigger(next as SlackTriggerFormValues);
        }}
      />
    </I18nProvider>
  );
};

describe('SlackTriggerEditor', () => {
  beforeEach(() => {
    onChange.mockClear();
    mockUseAllRelayAppBindings.mockReturnValue(connected);
  });

  it('adds an app or bot', async () => {
    render(<Editor kind="slack_message" />);

    fireEvent.click(screen.getByTestId('automationSlackTriggerBots'));
    const input = within(await screen.findByTestId('automationSlackTriggerBotsInput')).getByRole(
      'combobox'
    );
    fireEvent.change(input, { target: { value: 'PagerDuty' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'slack_message', bots: ['PagerDuty'] })
    );
    expect(screen.getByTestId('automationSlackTriggerBots')).toHaveTextContent('PagerDuty');
  });

  it('adds a connected channel by id and a message filter', async () => {
    render(<Editor kind="slack_message" />);

    fireEvent.click(screen.getByTestId('automationSlackTriggerChannels'));
    const channelInput = within(
      await screen.findByTestId('automationSlackTriggerChannelsInput')
    ).getByRole('combobox');
    fireEvent.change(channelInput, { target: { value: 'oncall' } });
    fireEvent.click(await screen.findByRole('option', { name: '#oncall' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'slack_message', channels: ['C2'] })
    );
    expect(screen.getByTestId('automationSlackTriggerChannels')).toHaveTextContent('#oncall');

    fireEvent.click(screen.getByTestId('automationSlackTriggerMessage'));
    fireEvent.change(await screen.findByTestId('automationSlackTriggerMessageInput'), {
      target: { value: 'outage' },
    });
    expect(screen.getByTestId('automationSlackTriggerMessage')).toHaveTextContent('outage');
  });

  it('does not accept a typed channel that is not connected', async () => {
    render(<Editor kind="slack_message" />);

    fireEvent.click(screen.getByTestId('automationSlackTriggerChannels'));
    const channelInput = within(
      await screen.findByTestId('automationSlackTriggerChannelsInput')
    ).getByRole('combobox');
    fireEvent.change(channelInput, { target: { value: '#random' } });
    fireEvent.keyDown(channelInput, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('flags a saved channel that is no longer connected', async () => {
    render(<Editor kind="slack_message" initialChannels={['#legacy']} />);

    const pill = screen.getByTestId('automationSlackTriggerChannels');
    expect(pill).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(pill);

    expect(await screen.findByTestId('automationSlackTriggerChannelsInputHelp')).toHaveTextContent(
      'Not connected: #legacy.'
    );
  });

  it('does not flag saved channels when the connected list is truncated', async () => {
    mockUseAllRelayAppBindings.mockReturnValue({ ...connected, isComplete: false });
    render(<Editor kind="slack_message" initialChannels={['C3000']} />);

    const pill = screen.getByTestId('automationSlackTriggerChannels');
    expect(pill).toHaveAttribute('aria-invalid', 'false');
    fireEvent.click(pill);

    expect(await screen.findByTestId('automationSlackTriggerChannelsInputHelp')).toHaveTextContent(
      'Showing the first 2 connected channels.'
    );
  });

  it('links to Settings when no channels are connected', async () => {
    mockUseAllRelayAppBindings.mockReturnValue({ ...connected, bindings: [] });
    render(<Editor kind="slack_message" />);

    fireEvent.click(screen.getByTestId('automationSlackTriggerChannels'));

    expect(
      await screen.findByTestId('automationSlackTriggerChannelsInputConnectLink')
    ).toHaveAttribute('href', '/app/nightshift/settings/general');
  });

  it('shows channel names when read only', () => {
    render(
      <I18nProvider>
        <SlackTriggerEditor
          readOnly
          trigger={{
            kind: 'slack_message',
            channels: ['C1'],
            users: [],
            bots: [],
            messageFilter: '',
          }}
          onChange={onChange}
        />
      </I18nProvider>
    );

    expect(screen.getByText('#alerts')).toBeInTheDocument();
  });

  describe('message filter', () => {
    const openMessageFilter = async () => {
      fireEvent.click(screen.getByTestId('automationSlackTriggerMessage'));
      return screen.findByTestId('automationSlackTriggerMessageInput');
    };

    it('closes the popover on Enter', async () => {
      render(<Editor kind="slack_message" />);
      const input = await openMessageFilter();

      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() =>
        expect(screen.queryByTestId('automationSlackTriggerMessageInput')).not.toBeInTheDocument()
      );
    });

    it('keeps the popover open on Enter while composing', async () => {
      render(<Editor kind="slack_message" />);
      const input = await openMessageFilter();

      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

      expect(screen.getByTestId('automationSlackTriggerMessageInput')).toBeInTheDocument();
    });

    it('strips newlines from the message filter', async () => {
      render(<Editor kind="slack_message" />);
      const input = await openMessageFilter();

      fireEvent.change(input, { target: { value: 'foo\r\nbar' } });

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ messageFilter: 'foobar' })
      );
    });
  });
});

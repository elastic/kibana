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

const onChange = jest.fn();

const Editor = ({ kind }: { kind: SlackTriggerKind }) => {
  const [trigger, setTrigger] = useState(createTriggerFormValues(kind) as SlackTriggerFormValues);
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
  beforeEach(() => onChange.mockClear());

  it('describes a new message trigger', () => {
    render(<Editor kind="slack_message" />);

    expect(screen.getByText('New message')).toBeInTheDocument();
    expect(screen.getByText('in')).toBeInTheDocument();
    expect(screen.getByTestId('automationSlackTriggerChannels')).toHaveTextContent(
      'Select channels'
    );
    expect(screen.getByTestId('automationSlackTriggerMessage')).toHaveTextContent('Any message');
    expect(screen.getByText('from')).toBeInTheDocument();
    expect(screen.getByTestId('automationSlackTriggerUsers')).toHaveTextContent('Anyone');
  });

  it('adds channels and a message filter', async () => {
    render(<Editor kind="slack_message" />);

    fireEvent.click(screen.getByTestId('automationSlackTriggerChannels'));
    const channelInput = within(
      await screen.findByTestId('automationSlackTriggerChannelsInput')
    ).getByRole('combobox');
    fireEvent.change(channelInput, { target: { value: '#oncall' } });
    fireEvent.keyDown(channelInput, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'slack_message', channels: ['#oncall'] })
    );
    expect(screen.getByTestId('automationSlackTriggerChannels')).toHaveTextContent('#oncall');

    fireEvent.click(screen.getByTestId('automationSlackTriggerMessage'));
    fireEvent.change(await screen.findByTestId('automationSlackTriggerMessageInput'), {
      target: { value: 'outage' },
    });
    expect(screen.getByTestId('automationSlackTriggerMessage')).toHaveTextContent('outage');
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

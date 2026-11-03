/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationActionsSection } from './automation_actions_section';
import type { SlackActionFormValues } from '../automation_form_values';

jest.mock('../../../../settings/components/apps_section/use_relay_app_bindings', () => ({
  ...jest.requireActual('../../../../settings/components/apps_section/use_relay_app_bindings'),
  useAllRelayAppBindings: () => ({
    bindings: [
      { channel: 'C1', displayName: 'alerts', status: 'bound_to_self' },
      { channel: 'C2', displayName: 'oncall', status: 'bound_to_self' },
    ],
    isLoading: false,
    isError: false,
    isComplete: true,
  }),
}));

const onSlackActionChange = jest.fn();

const ActionsSection = () => {
  const [slackAction, setSlackAction] = useState<SlackActionFormValues | undefined>();
  return (
    <I18nProvider>
      <AutomationActionsSection
        slackAction={slackAction}
        onSlackActionChange={(action) => {
          onSlackActionChange(action);
          setSlackAction(action);
        }}
      />
    </I18nProvider>
  );
};

describe('AutomationActionsSection', () => {
  beforeEach(() => onSlackActionChange.mockClear());

  it('adds, edits, and removes a Slack action', async () => {
    render(<ActionsSection />);

    fireEvent.click(screen.getByTestId('automationAddAction'));
    fireEvent.click(await screen.findByTestId('automationAddSlackAction'));
    expect(onSlackActionChange).toHaveBeenLastCalledWith({ target: 'channel', destination: '' });
    expect(screen.getByText('Post in Slack')).toBeInTheDocument();
    expect(screen.queryByTestId('automationAddAction')).not.toBeInTheDocument();

    const channelInput = within(screen.getByTestId('automationSlackChannelDestination')).getByRole(
      'combobox'
    );
    fireEvent.change(channelInput, { target: { value: 'oncall' } });
    fireEvent.click(await screen.findByRole('option', { name: '#oncall' }));
    expect(onSlackActionChange).toHaveBeenLastCalledWith({ target: 'channel', destination: 'C2' });

    fireEvent.change(screen.getByLabelText('Where to respond'), { target: { value: 'self' } });
    expect(onSlackActionChange).toHaveBeenLastCalledWith({ target: 'self', destination: '' });
    expect(screen.getByTestId('automationSlackDestination')).toHaveAttribute(
      'placeholder',
      'Search people…'
    );

    fireEvent.change(screen.getByTestId('automationSlackDestination'), {
      target: { value: '@me' },
    });
    expect(onSlackActionChange).toHaveBeenLastCalledWith({ target: 'self', destination: '@me' });

    fireEvent.click(screen.getByTestId('automationRemoveSlackAction'));
    expect(onSlackActionChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByTestId('automationAddAction')).toBeInTheDocument();
  });

  it('shows the channel name when read only', () => {
    render(
      <I18nProvider>
        <AutomationActionsSection
          readOnly
          slackAction={{ target: 'channel', destination: 'C1' }}
          onSlackActionChange={onSlackActionChange}
        />
      </I18nProvider>
    );

    expect(screen.getByText('#alerts')).toBeInTheDocument();
  });

  it('shows a locked reply-in-thread action without edit or remove controls', () => {
    render(
      <I18nProvider>
        <AutomationActionsSection
          slackAction={{ target: 'thread', destination: '' }}
          onSlackActionChange={onSlackActionChange}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Post in Slack')).toBeInTheDocument();
    expect(
      screen.getByText('Nightshift replies in the thread of the triggering message.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('automationRemoveSlackAction')).not.toBeInTheDocument();
    expect(screen.queryByTestId('automationSlackDestination')).not.toBeInTheDocument();
    expect(screen.queryByTestId('automationAddAction')).not.toBeInTheDocument();
  });
});

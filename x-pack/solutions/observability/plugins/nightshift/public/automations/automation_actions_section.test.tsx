/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationActionsSection } from './automation_actions_section';
import type { SlackActionDraft } from './automation_draft';

const onSlackActionChange = jest.fn();

const ActionsSection = () => {
  const [slackAction, setSlackAction] = useState<SlackActionDraft | undefined>();
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

  it('always shows the Learnings row', () => {
    render(<ActionsSection />);

    expect(screen.getByText('Learnings')).toBeInTheDocument();
    expect(
      screen.getByText('Nightshift updates knowledge, decision trees, and memories on each run.')
    ).toBeInTheDocument();
  });

  it('adds, edits, and removes a Slack action', async () => {
    render(<ActionsSection />);

    fireEvent.click(screen.getByTestId('automationAddAction'));
    fireEvent.click(await screen.findByTestId('automationAddSlackAction'));
    expect(onSlackActionChange).toHaveBeenLastCalledWith({ target: 'channel', destination: '' });
    expect(screen.getByText('Post in Slack')).toBeInTheDocument();
    expect(screen.queryByTestId('automationAddAction')).not.toBeInTheDocument();

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
});

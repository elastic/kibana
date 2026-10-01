/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationTriggerSection } from './automation_trigger_section';
import type { TriggerDraft } from './automation_draft';

const onTriggerChange = jest.fn();

const TriggerSection = ({ initialTrigger }: { initialTrigger?: TriggerDraft }) => {
  const [trigger, setTrigger] = useState(initialTrigger);
  const [dailyDispatchLimit, setDailyDispatchLimit] = useState('20');
  return (
    <I18nProvider>
      <AutomationTriggerSection
        trigger={trigger}
        dailyDispatchLimit={dailyDispatchLimit}
        onTriggerChange={(next) => {
          onTriggerChange(next);
          setTrigger(next);
        }}
        onDailyDispatchLimitChange={setDailyDispatchLimit}
      />
    </I18nProvider>
  );
};

const selectTrigger = async (testSubject: string, label: string) => {
  fireEvent.click(screen.getByTestId(testSubject));
  fireEvent.click(await screen.findByText(label));
};

const lastTrigger = () => onTriggerChange.mock.calls[onTriggerChange.mock.calls.length - 1][0];

describe('AutomationTriggerSection', () => {
  beforeEach(() => onTriggerChange.mockClear());

  it('shows the empty state and the trigger groups', async () => {
    render(<TriggerSection />);

    expect(screen.getByText('Choose what starts this automation.')).toBeInTheDocument();
    expect(screen.queryByTestId('automationChangeTrigger')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('automationAddTrigger'));
    expect(await screen.findByText('Elastic')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Every…')).toBeInTheDocument();
    expect(screen.getByText('Custom cron…')).toBeInTheDocument();
  });

  it('configures an alert trigger', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Alert triggered');

    expect(screen.getByText('When an alert')).toBeInTheDocument();
    expect(screen.getByTestId('automationDailyLimit')).toHaveValue(20);

    fireEvent.click(screen.getByTestId('automationRulePicker'));
    fireEvent.change(await screen.findByTestId('automationRuleNamePattern'), {
      target: { value: 'cpu' },
    });
    expect(lastTrigger()).toMatchObject({ kind: 'alert', ruleNamePattern: 'cpu' });
    expect(screen.getByTestId('automationRulePicker')).toHaveTextContent('cpu');

    fireEvent.click(screen.getByTestId('automationStatusPicker'));
    fireEvent.click(await screen.findByText('Recovered'));
    expect(lastTrigger()).toMatchObject({ alertStatus: 'inactive' });
    expect(screen.getByTestId('automationStatusPicker')).toHaveTextContent('Recovered');

    fireEvent.click(screen.getByText('Active'));
    expect(lastTrigger()).toMatchObject({ alertStatus: 'any' });
  });

  it('configures a weekly schedule', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Every…');

    expect(screen.getByText('between hours')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('between hours'));
    expect(lastTrigger()).toMatchObject({ betweenHours: true });
    expect(screen.getByLabelText('Start time')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('automationScheduleUnit'));
    fireEvent.click(await screen.findByText('Week'));
    expect(lastTrigger()).toMatchObject({ unit: 'week', daysOfWeek: [1, 2, 3, 4, 5] });

    fireEvent.click(screen.getByText('Mon'));
    expect(lastTrigger()).toMatchObject({ daysOfWeek: [2, 3, 4, 5] });
    fireEvent.click(screen.getByText('Sun'));
    expect(lastTrigger()).toMatchObject({ daysOfWeek: [2, 3, 4, 5, 0] });
  });

  it('describes a custom cron and hides the daily limit', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Custom cron…');

    expect(screen.queryByTestId('automationDailyLimit')).not.toBeInTheDocument();
    expect(screen.getByTestId('automationCronDescription')).toHaveTextContent('At 09:00 AM (UTC)');

    fireEvent.change(screen.getByTestId('automationCronExpression'), {
      target: { value: 'bad cron' },
    });
    expect(screen.getByTestId('automationCronDescription')).toHaveTextContent(
      'Fix the cron expression to save'
    );
  });

  it('lists common timezones with their offset', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Custom cron…');

    fireEvent.click(screen.getByTestId('automationTimezone'));
    expect(await screen.findByText('IST')).toBeInTheDocument();
    expect(screen.getByText('GMT+5.5')).toBeInTheDocument();
    fireEvent.click(screen.getByText('PST'));
    expect(lastTrigger()).toMatchObject({ kind: 'cron', timezone: 'PST' });
  });

  it('restores the previous values when switching back to a trigger type', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Custom cron…');
    fireEvent.change(screen.getByTestId('automationCronExpression'), {
      target: { value: '0 7 * * *' },
    });

    await selectTrigger('automationChangeTrigger', 'Alert triggered');
    expect(lastTrigger()).toMatchObject({ kind: 'alert' });

    await selectTrigger('automationChangeTrigger', 'Custom cron…');
    expect(screen.getByTestId('automationCronExpression')).toHaveValue('0 7 * * *');
  });

  it('flags an invalid daily limit', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Alert triggered');

    fireEvent.change(screen.getByTestId('automationDailyLimit'), { target: { value: '0' } });
    expect(screen.getByTestId('automationDailyLimit')).toBeInvalid();
  });
});

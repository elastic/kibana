/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationTriggerSection } from './trigger_section';
import type { TriggerFormValues } from '../automation_form_values';
import { toPresetSchedule } from '../automation_form_values';

const defaultCatalog = {
  data: [
    { name: 'CPU usage high', tags: ['infra', 'prod'] },
    { name: 'Disk full', tags: ['storage', 'prod'] },
    { name: 'Memory pressure', tags: ['infra'] },
  ],
  isError: false,
};
const mockUseRuleCatalog = jest.fn();
jest.mock('../../../../hooks/use_rule_catalog', () => ({
  useRuleCatalog: () => mockUseRuleCatalog(),
}));
jest.mock('../../../../settings/components/apps_section/use_relay_app_bindings', () => ({
  ...jest.requireActual('../../../../settings/components/apps_section/use_relay_app_bindings'),
  useAllRelayAppBindings: () => ({
    bindings: [],
    isLoading: false,
    isError: false,
    isComplete: true,
  }),
}));

const legacyPatternTrigger: TriggerFormValues = {
  kind: 'alert',
  ruleNamePattern: 'cpu',
  ruleNames: [],
  ruleTags: [],
};

const onTriggerChange = jest.fn();

const TriggerSection = ({ initialTrigger }: { initialTrigger?: TriggerFormValues }) => {
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
  beforeEach(() => {
    mockUseRuleCatalog.mockReturnValue(defaultCatalog);
  });

  beforeEach(() => onTriggerChange.mockClear());

  it('removes the trigger', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Alert triggered');

    fireEvent.click(screen.getByTestId('automationRemoveTrigger'));

    expect(lastTrigger()).toBeUndefined();
    expect(screen.getByTestId('automationAddTrigger')).toBeInTheDocument();
  });

  it('configures an alert trigger', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Alert triggered');

    expect(screen.getByText('When an alert')).toBeInTheDocument();
    expect(screen.getByTestId('automationDailyLimit')).toHaveValue(20);

    fireEvent.click(screen.getByTestId('automationRulePicker'));
    fireEvent.click(await screen.findByText('CPU usage high'));
    expect(lastTrigger()).toMatchObject({ kind: 'alert', ruleNames: ['CPU usage high'] });
    expect(screen.getByTestId('automationRulePicker')).toHaveTextContent('CPU usage high');
    expect(screen.getByText('changes to')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('selects rules and tags in the rule picker', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Alert triggered');
    fireEvent.click(screen.getByTestId('automationRulePicker'));

    fireEvent.click(await screen.findByText('Disk full'));
    expect(lastTrigger()).toMatchObject({ ruleNames: ['Disk full'] });

    fireEvent.click(screen.getByTestId('automationRulePickerTab-tags'));
    expect((await screen.findAllByText('2 rules now')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('infra'));
    expect(lastTrigger()).toMatchObject({ ruleNames: ['Disk full'], ruleTags: ['infra'] });
    expect(screen.getByTestId('automationRulePicker')).toHaveTextContent('3 rules');

    fireEvent.click(screen.getByTestId('automationRuleClear'));
    expect(lastTrigger()).toMatchObject({ ruleNames: [], ruleTags: [] });
  });

  it('replaces the legacy name pattern when rules are picked', async () => {
    render(<TriggerSection initialTrigger={legacyPatternTrigger} />);
    fireEvent.click(screen.getByTestId('automationRulePicker'));
    fireEvent.click(await screen.findByText('Disk full'));
    expect(lastTrigger()).toMatchObject({ ruleNamePattern: '', ruleNames: ['Disk full'] });
  });

  it('shows an error instead of an empty rule list when rules fail to load', async () => {
    mockUseRuleCatalog.mockReturnValue({ data: undefined, isError: true });
    render(<TriggerSection initialTrigger={{ ...legacyPatternTrigger, ruleNamePattern: '' }} />);
    fireEvent.click(screen.getByTestId('automationRulePicker'));
    expect(await screen.findByText('Unable to load rules.')).toBeInTheDocument();
  });

  it('does not offer bulk selection beyond the rule name limit', async () => {
    const rules = Array.from({ length: 101 }, (_, index) => ({ name: `Rule ${index}`, tags: [] }));
    mockUseRuleCatalog.mockReturnValue({ data: rules, isError: false });
    render(<TriggerSection initialTrigger={{ ...legacyPatternTrigger, ruleNamePattern: '' }} />);
    fireEvent.click(screen.getByTestId('automationRulePicker'));
    fireEvent.change(await screen.findByTestId('automationRulePickerSearch'), {
      target: { value: 'Rule' },
    });
    expect(screen.queryByTestId('automationRuleSelectShown')).not.toBeInTheDocument();
  });

  it('keeps the hourly window on whole hours', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Every…');
    fireEvent.click(screen.getByLabelText('between hours'));

    const start = screen.getByLabelText('Start time');
    const end = screen.getByLabelText('End time');
    fireEvent.change(start, { target: { value: '09:30' } });
    fireEvent.change(end, { target: { value: '17:45' } });

    expect(start).toHaveAttribute('step', '3600');
    expect(end).toHaveAttribute('step', '3600');
    expect(start).toHaveValue('09:00');
    expect(end).toHaveValue('17:00');
    expect(toPresetSchedule(lastTrigger())).toMatchObject({ hourWindow: { start: 9, end: 17 } });
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

  it('lists IANA timezones with their offset', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Every…');
    fireEvent.click(screen.getByLabelText('between hours'));

    fireEvent.click(screen.getByTestId('automationTimezone'));
    fireEvent.change(await screen.findByPlaceholderText('City or timezone…'), {
      target: { value: 'Tokyo' },
    });
    expect(await screen.findByText('GMT+9')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Asia/Tokyo'));
    expect(lastTrigger()).toMatchObject({ kind: 'every', timezone: 'Asia/Tokyo' });
  });

  it('flags an invalid daily limit', async () => {
    render(<TriggerSection />);
    await selectTrigger('automationAddTrigger', 'Alert triggered');

    fireEvent.change(screen.getByTestId('automationDailyLimit'), { target: { value: '0' } });
    expect(screen.getByTestId('automationDailyLimit')).toBeInvalid();
  });
});

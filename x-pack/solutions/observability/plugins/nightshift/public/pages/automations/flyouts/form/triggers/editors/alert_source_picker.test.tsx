/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { TriggerFormValues } from '../../automation_form_values';
import { AlertSourcePicker, alertSourcePillLabel } from './alert_source_picker';

type AlertTrigger = Extract<TriggerFormValues, { kind: 'alert' }>;

const alertTrigger = (overrides: Partial<AlertTrigger> = {}): AlertTrigger => ({
  kind: 'alert',
  ruleNamePattern: '',
  ruleNames: [],
  ruleTags: [],
  alertSources: [],
  alertSourceMode: 'include',
  ...overrides,
});

const onChange = jest.fn();

const Picker = ({ initial = alertTrigger() }: { initial?: AlertTrigger }) => {
  const [trigger, setTrigger] = useState(initial);
  return (
    <I18nProvider>
      <AlertSourcePicker
        trigger={trigger}
        onChange={(next) => {
          onChange(next);
          setTrigger(next as AlertTrigger);
        }}
      />
    </I18nProvider>
  );
};

const comboInput = () =>
  within(screen.getByTestId('automationAlertSourcesInput')).getByRole('combobox');

describe('alertSourcePillLabel', () => {
  it('reads "any source" when nothing is selected', () => {
    expect(alertSourcePillLabel(alertTrigger())).toBe('any source');
  });

  it('names known sources by label and unknown sources by their value', () => {
    expect(
      alertSourcePillLabel(alertTrigger({ alertSources: ['internal', 'datadog', 'external'] }))
    ).toBe('Universal rules, datadog, External sources');
  });

  it('prefixes the names in exclude mode', () => {
    expect(
      alertSourcePillLabel(alertTrigger({ alertSources: ['classic'], alertSourceMode: 'exclude' }))
    ).toBe('All except these: Classic');
  });
});

describe('AlertSourcePicker', () => {
  beforeEach(() => onChange.mockClear());

  it('stores the source key, not its label, when an option is picked', async () => {
    render(<Picker />);

    fireEvent.click(comboInput());
    fireEvent.click(await screen.findByRole('option', { name: 'External sources' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ alertSources: ['external'] })
    );
  });

  it('keeps a typed source as a trimmed literal and ignores blank input', () => {
    render(<Picker initial={alertTrigger({ alertSources: ['datadog'] })} />);

    fireEvent.change(comboInput(), { target: { value: '   ' } });
    fireEvent.keyDown(comboInput(), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(comboInput(), { target: { value: ' pagerduty ' } });
    fireEvent.keyDown(comboInput(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ alertSources: ['datadog', 'pagerduty'] })
    );
  });

  it('switches the mode and keeps the selected sources', () => {
    render(<Picker initial={alertTrigger({ alertSources: ['internal'] })} />);

    fireEvent.click(screen.getByText('All except these'));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ alertSourceMode: 'exclude', alertSources: ['internal'] })
    );
  });
});

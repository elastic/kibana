/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DailyLimitField } from './daily_limit_field';

describe('DailyLimitField', () => {
  it('shows the help text and reports changes', () => {
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <DailyLimitField value="20" helpText="Help text" onChange={onChange} />
      </I18nProvider>
    );

    expect(screen.getByText('Help text')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('automationDailyLimit'), { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('flags an invalid limit', () => {
    render(
      <I18nProvider>
        <DailyLimitField value="0" helpText="Help text" onChange={jest.fn()} />
      </I18nProvider>
    );

    expect(screen.getByTestId('automationDailyLimit')).toBeInvalid();
  });
});

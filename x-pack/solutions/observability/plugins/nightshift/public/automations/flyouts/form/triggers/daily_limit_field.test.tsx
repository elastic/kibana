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

  it('offers to raise the limit once it is reached', () => {
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <DailyLimitField value="10" helpText="Help text" onChange={onChange} usedToday={10} />
      </I18nProvider>
    );

    expect(screen.getByTestId('automationDailyLimitReachedCallout')).toHaveTextContent(
      'This automation has handled 10 triggers today (limit of 10).'
    );
    fireEvent.click(screen.getByTestId('automationDailyLimitRaise'));
    expect(onChange).toHaveBeenCalledWith('15');
  });

  it('shows the callout without the raise action when read-only', () => {
    render(
      <I18nProvider>
        <DailyLimitField
          value="20"
          helpText="Help text"
          onChange={jest.fn()}
          usedToday={27}
          readOnly
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('automationDailyLimitReachedCallout')).toHaveTextContent(
      '7 above the limit were not addressed'
    );
    expect(screen.queryByTestId('automationDailyLimitRaise')).not.toBeInTheDocument();
  });

  it('warns when usage is approaching the limit', () => {
    render(
      <I18nProvider>
        <DailyLimitField value="10" helpText="Help text" onChange={jest.fn()} usedToday={8} />
      </I18nProvider>
    );

    expect(screen.getByTestId('automationDailyLimitApproachingCallout')).toHaveTextContent(
      'This automation has handled 8 of 10 triggers today.'
    );
    expect(screen.queryByTestId('automationDailyLimitReachedCallout')).not.toBeInTheDocument();
  });

  it('warns about a high limit above 30', () => {
    render(
      <I18nProvider>
        <DailyLimitField value="31" helpText="Help text" onChange={jest.fn()} />
      </I18nProvider>
    );

    expect(screen.getByTestId('automationDailyLimitSoftCapCallout')).toHaveTextContent(
      'Your plan allows up to 50 triggers per day for this automation.'
    );
  });

  it('explains an unsaved limit change while editing', () => {
    render(
      <I18nProvider>
        <DailyLimitField value="15" helpText="Help text" onChange={jest.fn()} savedLimit={10} />
      </I18nProvider>
    );

    expect(screen.getByTestId('automationDailyLimitUnsavedCallout')).toHaveTextContent(
      'The saved limit is still 10 per day'
    );
  });

  it('starts editing with the raised limit from view mode', () => {
    const onRaiseLimit = jest.fn();
    render(
      <I18nProvider>
        <DailyLimitField
          value="10"
          helpText="Help text"
          onChange={jest.fn()}
          usedToday={10}
          onRaiseLimit={onRaiseLimit}
          readOnly
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('automationDailyLimitRaise'));

    expect(onRaiseLimit).toHaveBeenCalledWith(15);
  });
});

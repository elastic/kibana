/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScheduleIntervalField } from './schedule_interval_field';

const renderField = (current = '24h', onChange: jest.Mock = jest.fn()) => {
  const { rerender } = render(<ScheduleIntervalField current={current} onChange={onChange} />);
  return {
    onChange,
    rerender,
    value: () => screen.getByTestId('pndScheduleIntervalValue') as HTMLInputElement,
    unit: () => screen.getByTestId('pndScheduleIntervalUnit') as HTMLSelectElement,
  };
};

describe('ScheduleIntervalField', () => {
  it('decomposes the interval into a value and a unit', () => {
    const { value, unit } = renderField('30m');

    expect(value().value).toBe('30');
    expect(unit().value).toBe('m');
  });

  it('offers minutes, hours and days but not seconds', () => {
    const { unit } = renderField();

    expect([...unit().options].map((option) => option.value)).toEqual(['m', 'h', 'd']);
  });

  it('persists once on blur rather than per keystroke', () => {
    const { onChange, value } = renderField('24h');

    fireEvent.change(value(), { target: { value: '3' } });
    fireEvent.change(value(), { target: { value: '30' } });

    // A save per keystroke would rewrite the workflow and re-register its Task Manager schedule
    // twice, once at the intermediate "3h".
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(value());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('30h');
  });

  it('persists immediately when the unit changes', () => {
    const { onChange, unit } = renderField('24h');

    fireEvent.change(unit(), { target: { value: 'm' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('24m');
  });

  it('does not persist when blurred on the unchanged value', () => {
    const { onChange, value } = renderField('24h');

    fireEvent.blur(value());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores a non-positive-integer entry', () => {
    const { onChange, value } = renderField('24h');

    fireEvent.change(value(), { target: { value: '0' } });
    fireEvent.change(value(), { target: { value: '-5' } });
    fireEvent.blur(value());

    expect(value().value).toBe('24');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('re-syncs when the server echoes a different value', () => {
    const { rerender, value } = renderField('24h');

    rerender(<ScheduleIntervalField current="15m" onChange={jest.fn()} />);

    expect(value().value).toBe('15');
    expect(screen.getByTestId('pndScheduleIntervalUnit')).toHaveValue('m');
  });
});

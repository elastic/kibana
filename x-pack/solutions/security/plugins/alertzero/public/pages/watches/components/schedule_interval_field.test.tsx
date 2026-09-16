/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScheduleIntervalField } from './schedule_interval_field';

const renderField = (current = '24h', onChange: jest.Mock = jest.fn()) => {
  const { rerender } = render(<ScheduleIntervalField current={current} onChange={onChange} />);
  return {
    onChange,
    rerender,
    value: () => screen.getByTestId('alertZeroScheduleIntervalValue') as HTMLInputElement,
    unit: () => screen.getByTestId('alertZeroScheduleIntervalUnit') as HTMLSelectElement,
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

  it('reports each valid number change to the parent immediately, without blur', () => {
    const { onChange, value } = renderField('24h');

    fireEvent.change(value(), { target: { value: '3' } });
    fireEvent.change(value(), { target: { value: '30' } });

    expect(onChange.mock.calls).toEqual([['3h'], ['30h']]);
  });

  it('persists immediately when the unit changes', () => {
    const { onChange, unit } = renderField('24h');

    fireEvent.change(unit(), { target: { value: 'm' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('24m');
  });

  it('does not report an unchanged value', () => {
    const { onChange, value } = renderField('24h');

    fireEvent.change(value(), { target: { value: '24' } });

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

  it('re-syncs when the parent resets the value', () => {
    const { rerender, value } = renderField('24h');

    rerender(<ScheduleIntervalField current="15m" onChange={jest.fn()} />);

    expect(value().value).toBe('15');
    expect(screen.getByTestId('alertZeroScheduleIntervalUnit')).toHaveValue('m');
  });

  it('follows the parent after a change and reports the next edit against it', () => {
    const onChange = jest.fn();
    const Controlled: React.FC = () => {
      const [current, setCurrent] = useState('24h');
      return (
        <ScheduleIntervalField
          current={current}
          onChange={(interval) => {
            onChange(interval);
            setCurrent(interval);
          }}
        />
      );
    };
    render(<Controlled />);
    const value = screen.getByTestId('alertZeroScheduleIntervalValue');

    fireEvent.change(value, { target: { value: '30' } });
    fireEvent.change(value, { target: { value: '3' } });

    expect(onChange.mock.calls).toEqual([['30h'], ['3h']]);
    expect(value).toHaveValue(3);
  });
});

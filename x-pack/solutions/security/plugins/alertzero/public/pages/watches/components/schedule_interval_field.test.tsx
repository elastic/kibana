/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ScheduleIntervalField } from './schedule_interval_field';

describe('ScheduleIntervalField (Sep 14 Every N unit)', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
  });
  const WORKER_ID = 'system-security-floor-attack-discovery';

  it('parses the current interval into amount and unit selects', () => {
    render(<ScheduleIntervalField workerId={WORKER_ID} current="4h" onChange={onChange} />);
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    expect(screen.getByTestId(`alertZeroTriggerUnit-${WORKER_ID}`).textContent).toContain('hours');
  });

  it('commits a valid change as a scheduleInterval string', () => {
    render(<ScheduleIntervalField workerId={WORKER_ID} current="1h" onChange={onChange} />);
    const amount = screen.getByTestId(`alertZeroTriggerAmount-${WORKER_ID}`);
    fireEvent.change(amount, { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith('2h');
  });

  it('shows an inline error and does not commit when the amount is invalid', () => {
    render(<ScheduleIntervalField workerId={WORKER_ID} current="1h" onChange={onChange} />);
    const amount = screen.getByTestId(`alertZeroTriggerAmount-${WORKER_ID}`);
    fireEvent.change(amount, { target: { value: '0' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps a fractional amount on screen flagged instead of saving a floored cadence', () => {
    render(<ScheduleIntervalField workerId={WORKER_ID} current="1h" onChange={onChange} />);
    const amount = screen.getByTestId(`alertZeroTriggerAmount-${WORKER_ID}`);

    fireEvent.change(amount, { target: { value: '1.9' } });

    // Committing here would persist 1h — a cadence the analyst never asked for.
    expect(onChange).not.toHaveBeenCalled();
    expect(amount).toHaveValue(1.9);
    expect(amount).toBeInvalid();
  });

  it('does not commit the stale persisted amount when the unit changes over an invalid draft', () => {
    render(<ScheduleIntervalField workerId={WORKER_ID} current="1h" onChange={onChange} />);
    const amount = screen.getByTestId(`alertZeroTriggerAmount-${WORKER_ID}`);
    const unit = screen.getByTestId(`alertZeroTriggerUnit-${WORKER_ID}`);

    // Type an invalid draft (not committed) then switch units. Committing `1d` here (the old
    // persisted amount) would silently save a cadence the analyst never typed.
    fireEvent.change(amount, { target: { value: '1.9' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(unit, { target: { value: 'd' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(amount).toHaveValue(1.9);
    expect(amount).toBeInvalid();
  });

  it('keeps an invalid amount on screen through blur and reports validity to the page', () => {
    const onValidityChange = jest.fn();
    render(
      <ScheduleIntervalField
        workerId={WORKER_ID}
        current="1h"
        onChange={onChange}
        onValidityChange={onValidityChange}
      />
    );
    const amount = screen.getByTestId(`alertZeroTriggerAmount-${WORKER_ID}`);

    fireEvent.change(amount, { target: { value: '1.9' } });
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    // Blurring used to drop the draft, snapping the field back to 1h and hiding the problem from
    // the page's Save gate.
    fireEvent.blur(amount);

    expect(amount).toHaveValue(1.9);
    expect(amount).toBeInvalid();
    expect(onChange).not.toHaveBeenCalled();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
  });

  it('clears the flagged draft when the page bumps resetKey on Discard', () => {
    const onValidityChange = jest.fn();
    const { rerender } = render(
      <ScheduleIntervalField
        workerId={WORKER_ID}
        current="1h"
        onChange={onChange}
        onValidityChange={onValidityChange}
        resetKey={0}
      />
    );
    const amount = screen.getByTestId(`alertZeroTriggerAmount-${WORKER_ID}`);
    fireEvent.change(amount, { target: { value: '1.9' } });
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    rerender(
      <ScheduleIntervalField
        workerId={WORKER_ID}
        current="1h"
        onChange={onChange}
        onValidityChange={onValidityChange}
        resetKey={1}
      />
    );

    expect(amount).toHaveValue(1);
    expect(amount).not.toBeInvalid();
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });
});

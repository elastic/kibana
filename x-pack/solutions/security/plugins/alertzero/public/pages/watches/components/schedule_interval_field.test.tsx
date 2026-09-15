/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
});

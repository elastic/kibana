/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import {
  HealthIntervalGranularity,
  HealthIntervalType,
} from '../../../../../common/api/detection_engine';
import { HealthIntervalFilter } from './health_interval_filter';

const renderFilter = (
  value: React.ComponentProps<typeof HealthIntervalFilter>['value'],
  onChange = jest.fn()
) =>
  render(
    <EuiProvider>
      <HealthIntervalFilter value={value} onChange={onChange} />
    </EuiProvider>
  );

describe('HealthIntervalFilter', () => {
  it('renders the supplied interval type and granularity', () => {
    renderFilter({
      type: HealthIntervalType.last_week,
      granularity: HealthIntervalGranularity.day,
    });

    const [intervalType, granularity] = screen.getAllByRole('combobox');
    expect(intervalType).toHaveValue(HealthIntervalType.last_week);
    expect(granularity).toHaveValue(HealthIntervalGranularity.day);
  });

  it('synchronizes the custom range when the supplied value changes', () => {
    const { rerender } = renderFilter({
      type: HealthIntervalType.last_day,
      granularity: HealthIntervalGranularity.hour,
    });

    rerender(
      <EuiProvider>
        <HealthIntervalFilter
          value={{
            type: HealthIntervalType.custom_range,
            granularity: HealthIntervalGranularity.hour,
            from: '2026-01-02T00:00:00.000Z',
            to: '2026-01-03T00:00:00.000Z',
          }}
          onChange={jest.fn()}
        />
      </EuiProvider>
    );

    const dateInputs = screen.getAllByRole<HTMLInputElement>('textbox');
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0].value).toContain('01/02/2026');
    expect(dateInputs[1].value).toContain('01/03/2026');
  });

  it('emits an allowed granularity when the interval type changes', () => {
    const onChange = jest.fn();
    renderFilter(
      {
        type: HealthIntervalType.last_day,
        granularity: HealthIntervalGranularity.hour,
      },
      onChange
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: HealthIntervalType.last_hour },
    });

    expect(onChange).toHaveBeenCalledWith({
      type: HealthIntervalType.last_hour,
      granularity: HealthIntervalGranularity.minute,
    });
  });
});

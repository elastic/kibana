/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useEnvironment } from '../hooks/use_environment';
import { ApplicationTabToolbar } from './application_tab_toolbar';
import { EnvironmentFilter } from './environment_filter';
import { TimeRangePicker } from './time_range_picker';

jest.mock('../hooks/use_environment');
jest.mock('./environment_filter', () => {
  return {
    EnvironmentFilter: jest.fn(() => {
      return <div data-test-subj="environmentFilter" />;
    }),
  };
});
jest.mock('./time_range_picker', () => {
  return {
    TimeRangePicker: jest.fn(() => {
      return <div data-test-subj="timeRangePicker" />;
    }),
  };
});

const setEnvironment = jest.fn();

const filterProps = () => {
  return jest.mocked(EnvironmentFilter).mock.lastCall?.[0];
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useEnvironment).mockReturnValue({ environment: 'production', setEnvironment });
});

describe('ApplicationTabToolbar', () => {
  it('shows the environments with the selected one, and the time range with its refresh', () => {
    const onRefresh = jest.fn();
    render(
      <ApplicationTabToolbar
        environments={['production', 'staging']}
        isLoading={false}
        onRefresh={onRefresh}
      />
    );

    expect(screen.getByTestId('environmentFilter')).toBeInTheDocument();
    expect(filterProps()).toMatchObject({
      environments: ['production', 'staging'],
      selected: 'production',
      onChange: setEnvironment,
      isLoading: false,
    });
    expect(jest.mocked(TimeRangePicker).mock.lastCall?.[0]).toEqual({ onRefresh });
  });

  it('shows the environments as loading only until the tab has loaded once', () => {
    const { rerender } = render(
      <ApplicationTabToolbar environments={undefined} isLoading onRefresh={jest.fn()} />
    );
    expect(filterProps()).toMatchObject({ environments: [], isLoading: true });

    rerender(
      <ApplicationTabToolbar environments={['production']} isLoading onRefresh={jest.fn()} />
    );
    expect(filterProps()).toMatchObject({ environments: ['production'], isLoading: false });
  });
});

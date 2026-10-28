/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnvironmentFilter } from './environment_filter';

const renderFilter = (selected?: string, environments = ['ENVIRONMENT_NOT_DEFINED', 'staging']) => {
  const onChange = jest.fn();
  render(
    <EnvironmentFilter
      environments={environments}
      selected={selected}
      onChange={onChange}
      isLoading={false}
    />
  );
  fireEvent.click(screen.getByTestId('digitalExperienceEnvironmentFilter'));
  return { onChange };
};

const option = (value: string) =>
  screen.getByTestId(`digitalExperienceEnvironmentFilterOption-${value}`);

// Not the accessible names: EUI adds screen-reader instructions to them.
const optionValues = () =>
  screen.getAllByRole('option').map((element) => element.getAttribute('value'));

describe('EnvironmentFilter', () => {
  it('lists "All", "Not defined" and the environments', () => {
    renderFilter();

    expect(optionValues()).toEqual(['ENVIRONMENT_ALL', 'ENVIRONMENT_NOT_DEFINED', 'staging']);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Not defined')).toBeInTheDocument();
  });

  it('checks "All" when no environment is selected', () => {
    renderFilter();

    expect(option('ENVIRONMENT_ALL')).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps a selected environment the time range has no data for', () => {
    renderFilter('canary');

    expect(option('canary')).toHaveAttribute('aria-selected', 'true');
  });

  it('selects an environment', () => {
    const { onChange } = renderFilter('staging');

    fireEvent.click(option('ENVIRONMENT_NOT_DEFINED'));

    expect(onChange).toHaveBeenCalledWith('ENVIRONMENT_NOT_DEFINED');
  });

  it('selects all environments as `undefined`', () => {
    const { onChange } = renderFilter('staging');

    fireEvent.click(option('ENVIRONMENT_ALL'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
  it('shows the selection on the button', () => {
    renderFilter('staging');

    expect(screen.getByTestId('digitalExperienceEnvironmentFilter')).toHaveTextContent(
      'Environment: staging'
    );
  });

  it('shows only the label without a selection', () => {
    renderFilter();

    expect(screen.getByTestId('digitalExperienceEnvironmentFilter')).toHaveTextContent(
      /^Environment$/
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as URL from '../../../../hooks/use_url_params';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../../utils/testing/rtl_helpers';
import {
  getSupportedUrlParams,
  type SyntheticsUrlParams,
} from '../../../../utils/url_params/get_supported_url_params';
import { SelectedFilterPills } from './selected_filter_pills';

const mockUrlParams = (overrides: Partial<SyntheticsUrlParams> = {}): SyntheticsUrlParams => ({
  ...getSupportedUrlParams({}),
  ...overrides,
});

describe('SelectedFilterPills', () => {
  let useUrlParamsSpy: jest.SpyInstance<[URL.GetUrlParams, URL.UpdateUrlParams]>;
  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;
  let updateUrlParamsMock: jest.Mock;
  const handleFilterChange = jest.fn();

  beforeEach(() => {
    handleFilterChange.mockReset();
    useUrlParamsSpy = jest.spyOn(URL, 'useUrlParams');
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');
    updateUrlParamsMock = jest.fn();

    useUrlParamsSpy.mockImplementation(() => [jest.fn().mockReturnValue({}), updateUrlParamsMock]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is hidden when no filters are selected', () => {
    useGetUrlParamsSpy.mockReturnValue(mockUrlParams());

    const { queryByText } = render(<SelectedFilterPills handleFilterChange={handleFilterChange} />);

    expect(queryByText('Clear all filters')).toBeNull();
    expect(queryByText(/Type:/)).toBeNull();
  });

  it('renders a pill per selected filter and removes one value', () => {
    useGetUrlParamsSpy.mockReturnValue(
      mockUrlParams({
        statusFilter: 'down',
        tags: ['prod'],
        locations: ['us_east'],
        monitorTypes: ['http', 'tcp'],
      })
    );

    const { getByText, getByRole } = render(
      <SelectedFilterPills handleFilterChange={handleFilterChange} />
    );

    expect(getByText('Type: HTTP')).toBeInTheDocument();
    expect(getByText('Type: TCP')).toBeInTheDocument();
    expect(getByText('Location: US East')).toBeInTheDocument();
    expect(getByText('Tags: prod')).toBeInTheDocument();
    expect(getByText('Status: Down')).toBeInTheDocument();
    expect(getByText('Clear all filters')).toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Remove Type filter HTTP' }));

    expect(handleFilterChange).toHaveBeenCalledWith('monitorTypes', ['TCP'], false);
  });

  it('clears the last remaining value for a field', () => {
    useGetUrlParamsSpy.mockReturnValue(mockUrlParams({ tags: ['prod'] }));

    const { getByRole } = render(<SelectedFilterPills handleFilterChange={handleFilterChange} />);

    fireEvent.click(getByRole('button', { name: 'Remove Tags filter prod' }));

    expect(handleFilterChange).toHaveBeenCalledWith('tags', undefined, false);
  });

  it('omits excluded fields', () => {
    useGetUrlParamsSpy.mockReturnValue(mockUrlParams({ schedules: ['3'] }));

    const { queryByText } = render(
      <SelectedFilterPills handleFilterChange={handleFilterChange} excludeFields={['schedules']} />
    );

    expect(queryByText(/Frequency:/)).toBeNull();
  });
});

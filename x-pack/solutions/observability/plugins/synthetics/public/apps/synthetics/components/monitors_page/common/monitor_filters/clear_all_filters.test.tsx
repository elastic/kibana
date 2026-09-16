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
import type { SyntheticsUrlParams } from '../../../../utils/url_params/get_supported_url_params';
import { getClearedMonitorFilterParams } from '../../../../utils/filters/clear_monitor_filter_params';
import { ClearAllFilters } from './clear_all_filters';

describe('ClearAllFilters', () => {
  let useUrlParamsSpy: jest.SpyInstance<[URL.GetUrlParams, URL.UpdateUrlParams]>;
  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;
  let updateUrlParamsMock: jest.Mock;

  beforeEach(() => {
    useUrlParamsSpy = jest.spyOn(URL, 'useUrlParams');
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');
    updateUrlParamsMock = jest.fn();

    useUrlParamsSpy.mockImplementation(() => [jest.fn().mockReturnValue({}), updateUrlParamsMock]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is hidden when no filters are selected', () => {
    useGetUrlParamsSpy.mockReturnValue({
      query: '',
      statusFilter: '',
      tags: [],
      locations: [],
      monitorTypes: [],
      projects: [],
      schedules: [],
      remoteNames: [],
      useLogicalAndFor: [],
      configIds: [],
    } as SyntheticsUrlParams);

    const { queryByRole } = render(<ClearAllFilters />);

    expect(queryByRole('button', { name: 'Clear all selected Synthetics filters' })).toBeNull();
  });

  it('clears filter url params and keeps date range keys unset', () => {
    useGetUrlParamsSpy.mockReturnValue({
      query: 'checkout',
      statusFilter: 'down',
      tags: ['prod'],
      locations: ['us-east'],
      monitorTypes: ['http'],
      projects: [],
      schedules: [],
      remoteNames: [],
      useLogicalAndFor: [],
      configIds: [],
    } as SyntheticsUrlParams);

    const { getByRole } = render(<ClearAllFilters />);

    fireEvent.click(getByRole('button', { name: 'Clear all selected Synthetics filters' }));

    expect(updateUrlParamsMock).toHaveBeenCalledWith(getClearedMonitorFilterParams());
  });
});

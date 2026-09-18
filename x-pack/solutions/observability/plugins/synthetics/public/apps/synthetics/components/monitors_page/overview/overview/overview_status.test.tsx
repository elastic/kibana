/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import * as URL from '../../../../hooks/use_url_params';
import { render } from '../../../../utils/testing/rtl_helpers';
import type { SyntheticsUrlParams } from '../../../../utils/url_params/get_supported_url_params';
import * as overviewStatusHook from '../../hooks/use_overview_status';
import { OverviewStatus } from './overview_status';

describe('OverviewStatus', () => {
  let useUrlParamsSpy: jest.SpyInstance<[URL.GetUrlParams, URL.UpdateUrlParams]>;
  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;
  let updateUrlParamsMock: jest.Mock;

  beforeEach(() => {
    useUrlParamsSpy = jest.spyOn(URL, 'useUrlParams');
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');
    updateUrlParamsMock = jest.fn();

    useUrlParamsSpy.mockImplementation(() => [jest.fn().mockReturnValue({}), updateUrlParamsMock]);
    useGetUrlParamsSpy.mockReturnValue({} as SyntheticsUrlParams);

    jest.spyOn(overviewStatusHook, 'useOverviewStatusState').mockReturnValue({
      status: { up: 2, down: 1, pending: 0, stale: 0, disabledCount: 0 } as any,
      error: undefined,
      loading: false,
      loaded: true,
      settled: true,
      allConfigs: [],
      total: 0,
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Regression coverage: this used to call `application.navigateToApp(..., {
  // path: '?statusFilter=X' })`, which replaces the whole query string —
  // discarding every other active filter and the brushed/date-picker range.
  it.each(['Up', 'Down'])('merges the status filter into the existing url params', (status) => {
    const { getByText } = render(<OverviewStatus areStatsClickable />);

    fireEvent.click(getByText(status));

    expect(updateUrlParamsMock).toHaveBeenCalledWith({
      statusFilter: status.toLowerCase(),
    });
  });

  it.each(['Up', 'Down'])(
    'clears the status filter when the active one is clicked again',
    (status) => {
      useGetUrlParamsSpy.mockReturnValue({
        statusFilter: status.toLowerCase(),
      } as SyntheticsUrlParams);

      const { getByText } = render(<OverviewStatus areStatsClickable />);

      fireEvent.click(getByText(status));

      expect(updateUrlParamsMock).toHaveBeenCalledWith({
        statusFilter: undefined,
      });
    }
  );

  it('does not wire up a click handler when stats are not clickable', () => {
    const { getByTestId, queryByTestId } = render(<OverviewStatus />);

    expect(getByTestId('syntheticsOverviewUp')).toBeInTheDocument();
    expect(queryByTestId('syntheticsOverviewUpBtn')).not.toBeInTheDocument();
  });
});

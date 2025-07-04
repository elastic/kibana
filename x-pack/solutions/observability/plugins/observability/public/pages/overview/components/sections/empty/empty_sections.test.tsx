/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../utils/test_helper';
import { EmptySections } from './empty_sections';
import * as hasDataHook from '../../../../../hooks/use_has_data';
import * as fetcherHook from '@kbn/observability-shared-plugin/public/hooks/use_fetcher';
import { HasDataContextValue } from '../../../../../context/has_data_context/has_data_context';
import { useKibana } from '../../../../../utils/kibana_react';

jest.mock('../../../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

describe('EmptySections', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(hasDataHook, 'useHasData').mockReturnValue({
      hasDataMap: {
        infra_logs: {
          status: fetcherHook.FETCH_STATUS.FAILURE,
          hasData: false,
        },
        apm: {
          status: fetcherHook.FETCH_STATUS.FAILURE,
          hasData: false,
        },
        infra_metrics: {
          status: fetcherHook.FETCH_STATUS.FAILURE,
          hasData: false,
        },
        uptime: {
          status: fetcherHook.FETCH_STATUS.FAILURE,
          hasData: false,
        },
        ux: {
          status: fetcherHook.FETCH_STATUS.FAILURE,
          hasData: false,
        },
        alert: {
          status: fetcherHook.FETCH_STATUS.FAILURE,
          hasData: false,
        },
        universal_profiling: {
          status: fetcherHook.FETCH_STATUS.FAILURE,
          hasData: false,
        },
      },
    } as HasDataContextValue);
  });

  it('should display all sections when stateful', () => {
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { prepend: jest.fn() } },
        serverless: undefined,
      },
    });

    const { queryAllByTestId } = render(<EmptySections />);
    expect(queryAllByTestId('empty-section-infra_logs')).toBeTruthy();
    expect(queryAllByTestId('empty-section-apm')).toBeTruthy();
    expect(queryAllByTestId('empty-section-infra_metrics')).toBeTruthy();
    expect(queryAllByTestId('empty-section-uptime')).toBeTruthy();
    expect(queryAllByTestId('empty-section-ux')).toBeTruthy();
    expect(queryAllByTestId('empty-section-alert')).toBeTruthy();
    expect(queryAllByTestId('empty-section-universal_profiling')).toBeTruthy();
  });

  it("should display only sections containing 'showInServerless: true' when serverless", () => {
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { prepend: jest.fn() } },
        serverless: true,
      },
    });

    const { queryAllByTestId } = render(<EmptySections />);
    expect(queryAllByTestId('empty-section-infra_logs')).toBeTruthy();
    expect(queryAllByTestId('empty-section-apm')).toBeTruthy();
    expect(queryAllByTestId('empty-section-infra_metrics')).toBeTruthy();
    expect(queryAllByTestId('empty-section-alert')).toBeTruthy();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { timefilterServiceMock } from '@kbn/data-plugin/public/query/timefilter/timefilter_service.mock';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-shared-plugin/common';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { ObservabilityAlertSearchBar } from './alert_search_bar';
import type { ObservabilityAlertSearchBarProps, Services } from './types';

const getAlertsSearchBarMock = jest.fn();
const ALERT_SEARCH_BAR_DATA_TEST_SUBJ = 'alerts-search-bar';
const ALERT_UUID = '413a9631-1a29-4344-a8b4-9a1dc23421ee';

describe('ObservabilityAlertSearchBar', () => {
  const { http, data, dataViews, notifications, spaces } = kibanaStartMock.startContract().services;
  spaces.getActiveSpace = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ id: 'space-id', name: 'space-name', disabledFeatures: [] })
    );
  const renderComponent = (
    props: Partial<ObservabilityAlertSearchBarProps> = {},
    services: Partial<Services> = {}
  ) => {
    const observabilityAlertSearchBarProps: ObservabilityAlertSearchBarProps = {
      appName: 'testAppName',
      kuery: '',
      filters: [],
      filterControls: [],
      onRangeFromChange: jest.fn(),
      onRangeToChange: jest.fn(),
      onKueryChange: jest.fn(),
      onStatusChange: jest.fn(),
      onEsQueryChange: jest.fn(),
      onFiltersChange: jest.fn(),
      onControlConfigsChange: jest.fn(),
      onFilterControlsChange: jest.fn(),
      setSavedQuery: jest.fn(),
      rangeTo: 'now',
      rangeFrom: 'now-15m',
      status: 'all',
      services: {
        uiSettings: uiSettingsServiceMock.createStartContract(),
        timeFilterService: timefilterServiceMock.createStartContract().timefilter,
        AlertsSearchBar: getAlertsSearchBarMock.mockReturnValue(
          <div data-test-subj={ALERT_SEARCH_BAR_DATA_TEST_SUBJ} />
        ),
        useToasts: jest.fn(),
        http,
        data,
        dataViews,
        notifications,
        spaces,
        ...services,
      },
      ...props,
    };
    return render(<ObservabilityAlertSearchBar {...observabilityAlertSearchBarProps} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert search bar', async () => {
    const observabilitySearchBar = renderComponent();

    await waitFor(() =>
      expect(observabilitySearchBar.queryByTestId(ALERT_SEARCH_BAR_DATA_TEST_SUBJ)).toBeTruthy()
    );
  });

  it('should call alert search bar with correct props', () => {
    renderComponent();

    expect(getAlertsSearchBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'testAppName',
        ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        query: '',
      }),
      {}
    );
  });

  it('should include defaultFilters in es query', async () => {
    const mockedOnEsQueryChange = jest.fn();
    const mockedFrom = '2022-11-15T09:38:13.604Z';
    const mockedTo = '2022-11-15T09:53:13.604Z';
    const defaultFilters: Filter[] = [
      {
        query: {
          match_phrase: {
            'kibana.alert.rule.uuid': ALERT_UUID,
          },
        },
        meta: {},
      },
    ];

    await act(async () => {
      renderComponent({
        onEsQueryChange: mockedOnEsQueryChange,
        rangeFrom: mockedFrom,
        rangeTo: mockedTo,
        defaultFilters,
        status: 'all',
      });
    });

    const esQueryChangeParams = {
      bool: {
        filter: [
          {
            range: {
              'kibana.alert.time_range': expect.objectContaining({
                format: 'strict_date_optional_time',
                gte: mockedFrom,
                lte: mockedTo,
              }),
            },
          },
          {
            match_phrase: {
              'kibana.alert.rule.uuid': ALERT_UUID,
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    };
    expect(mockedOnEsQueryChange).toHaveBeenCalledTimes(1);
    expect(mockedOnEsQueryChange).toHaveBeenNthCalledWith(1, esQueryChangeParams);
  });

  it('should include filterControls in es query', async () => {
    const mockedOnEsQueryChange = jest.fn();
    const mockedFrom = '2022-11-15T09:38:13.604Z';
    const mockedTo = '2022-11-15T09:53:13.604Z';
    const filterControls: Filter[] = [
      {
        query: {
          match_phrase: {
            'kibana.alert.rule.uuid': ALERT_UUID,
          },
        },
        meta: {},
      },
    ];

    await act(async () => {
      renderComponent({
        onEsQueryChange: mockedOnEsQueryChange,
        rangeFrom: mockedFrom,
        rangeTo: mockedTo,
        filterControls,
        status: 'all',
      });
    });

    const esQueryChangeParams = {
      bool: {
        filter: [
          {
            range: {
              'kibana.alert.time_range': expect.objectContaining({
                format: 'strict_date_optional_time',
                gte: mockedFrom,
                lte: mockedTo,
              }),
            },
          },
          {
            match_phrase: {
              'kibana.alert.rule.uuid': ALERT_UUID,
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    };
    expect(mockedOnEsQueryChange).toHaveBeenCalledTimes(1);
    expect(mockedOnEsQueryChange).toHaveBeenNthCalledWith(1, esQueryChangeParams);
  });

  it('should include filters in es query', async () => {
    const mockedOnEsQueryChange = jest.fn();
    const mockedFrom = '2022-11-15T09:38:13.604Z';
    const mockedTo = '2022-11-15T09:53:13.604Z';
    const filters = [
      {
        meta: {},
        query: {
          'service.name': {
            value: 'synth-node-0',
          },
        },
      },
    ];

    renderComponent({
      onEsQueryChange: mockedOnEsQueryChange,
      rangeFrom: mockedFrom,
      rangeTo: mockedTo,
      filters,
    });

    expect(mockedOnEsQueryChange).toHaveBeenCalledWith({
      bool: {
        filter: [
          {
            range: {
              'kibana.alert.time_range': expect.objectContaining({
                format: 'strict_date_optional_time',
                gte: mockedFrom,
                lte: mockedTo,
              }),
            },
          },
          {
            'service.name': {
              value: 'synth-node-0',
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    });
  });

  it('should show error in a toast', async () => {
    const error = new Error('something is wrong in esQueryChange');
    const mockedOnEsQueryChange = jest.fn().mockImplementation(() => {
      throw error;
    });
    const mockedAddError = jest.fn();
    const mockedUseToast = jest.fn().mockImplementation(() => ({
      addError: mockedAddError,
    }));

    renderComponent(
      {
        onEsQueryChange: mockedOnEsQueryChange,
      },
      {
        useToasts: mockedUseToast,
      }
    );

    expect(mockedAddError).toHaveBeenCalledWith(error, { title: 'Invalid query string' });
  });
});

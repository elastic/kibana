/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators } from './types';
import { LocatorPublic } from '@kbn/share-plugin/common';
import type { LogsLocatorParams } from '@kbn/logs-shared-plugin/common';
import { getViewInAppUrl, GetViewInAppUrlArgs } from './get_view_in_app_url';

describe('getViewInAppUrl', () => {
  const logsLocator = {
    getRedirectUrl: jest.fn(() => 'mockedGetRedirectUrl'),
  } as unknown as LocatorPublic<LogsLocatorParams>;
  const startedAt = '2023-12-07T16:30:15.403Z';
  const endedAt = '2023-12-07T20:30:15.403Z';
  const returnedTimeRange = {
    // Duration 4 hour, time range will be extended it with 30 minutes from each side
    from: '2023-12-07T16:00:15.403Z',
    to: '2023-12-07T21:00:15.403Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should return empty string if logsLocator is not provided', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [],
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('');
  });

  it('should call getRedirectUrl with data view, time range and filters', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
      ],
      logsLocator,
      startedAt,
      endedAt,
      searchConfiguration: {
        index: {},
        query: {
          language: '',
          query: 'mockedFilter',
        },
      },
      dataViewId: 'mockedDataViewId',
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataViewId: args.dataViewId,
        dataViewSpec: undefined,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: 'mockedFilter and mockedCountFilter',
          language: 'kuery',
        },
      },
      {}
    );
  });

  it('should call getRedirectUrl with only count filter', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
      ],
      logsLocator,
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataset: undefined,
        dataViewSpec: undefined,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: 'mockedCountFilter',
          language: 'kuery',
        },
      },
      {}
    );
  });

  it('should call getRedirectUrl with only filter', () => {
    const args: GetViewInAppUrlArgs = {
      logsLocator,
      startedAt,
      endedAt,
      searchConfiguration: {
        index: {},
        query: {
          language: '',
          query: 'mockedFilter',
        },
      },
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataViewId: undefined,
        dataViewSpec: undefined,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: 'mockedFilter',
          language: 'kuery',
        },
      },
      {}
    );
  });

  it('should call getRedirectUrl with empty query if metrics and filter are not not provided', () => {
    const args: GetViewInAppUrlArgs = {
      logsLocator,
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataset: undefined,
        dataViewSpec: undefined,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: '',
          language: 'kuery',
        },
      },
      {}
    );
  });

  it('should call getRedirectUrl with empty if there are multiple metrics', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
        {
          name: 'A',
          aggType: Aggregators.AVERAGE,
          field: 'mockedAvgField',
        },
      ],
      logsLocator,
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataset: undefined,
        dataViewSpec: undefined,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: '',
          language: 'kuery',
        },
      },
      {}
    );
  });

  it('should call getRedirectUrl with filters if group and searchConfiguration filter are provided', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
        {
          name: 'A',
          aggType: Aggregators.AVERAGE,
          field: 'mockedAvgField',
        },
      ],
      logsLocator,
      startedAt,
      endedAt,
      searchConfiguration: {
        index: {},
        query: {
          language: '',
          query: 'mockedFilter',
        },
        filter: [
          {
            meta: {},
            query: {
              term: {
                field: {
                  value: 'justTesting',
                },
              },
            },
          },
        ],
      },
      groups: [
        {
          field: 'host.name',
          value: 'host-1',
        },
      ],
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataViewId: undefined,
        dataViewSpec: undefined,
        timeRange: returnedTimeRange,
        filters: [
          {
            meta: {},
            query: {
              term: {
                field: {
                  value: 'justTesting',
                },
              },
            },
          },
          {
            meta: {},
            query: {
              match_phrase: {
                'host.name': 'host-1',
              },
            },
          },
        ],
        query: {
          query: 'mockedFilter',
          language: 'kuery',
        },
      },
      {}
    );
  });

  it('should call getRedirectUrl with spaceId', () => {
    const spaceId = 'mockedSpaceId';
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
      ],
      logsLocator,
      startedAt,
      endedAt,
      spaceId,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataset: undefined,
        dataViewSpec: undefined,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: 'mockedCountFilter',
          language: 'kuery',
        },
      },
      { spaceId }
    );
  });
  it('should call getRedirectUrl with dataViewSpec of the AD-HOC data view', () => {
    const spaceId = 'mockedSpaceId';
    const dataViewSpec = {
      id: 'mockedDataViewId',
      title: 'mockedDataViewTitle',
      timeFieldName: '@timestamp',
      sourceFilters: [],
      fieldFormats: {},
      runtimeFieldMap: {},
      allowNoIndex: false,
      name: 'mockedDataViewName',
      allowHidden: false,
    };
    const args: GetViewInAppUrlArgs = {
      searchConfiguration: {
        index: dataViewSpec,
        query: {
          language: '',
          query: 'mockedFilter',
        },
        filter: [],
      },
      logsLocator,
      startedAt,
      endedAt,
      spaceId,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataset: undefined,
        dataViewSpec,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: 'mockedFilter',
          language: 'kuery',
        },
      },
      { spaceId }
    );
  });
  it('should call getRedirectUrl with the id of the SAVED data view ', () => {
    const spaceId = 'mockedSpaceId';
    const mockedDataViewId = 'uuid-mocked-dataView-id';
    const args: GetViewInAppUrlArgs = {
      dataViewId: mockedDataViewId,
      searchConfiguration: {
        index: 'uuid-mockedDataViewId',
        query: {
          language: '',
          query: 'mockedFilter',
        },
        filter: [],
      },
      logsLocator,
      startedAt,
      endedAt,
      spaceId,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsLocator.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataset: undefined,
        dataViewSpec: undefined,
        dataViewId: mockedDataViewId,
        timeRange: returnedTimeRange,
        filters: [],
        query: {
          query: 'mockedFilter',
          language: 'kuery',
        },
      },
      { spaceId }
    );
  });
});

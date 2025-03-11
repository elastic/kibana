/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { RefreshInterval } from '@kbn/data-plugin/common';
import { TimeRange } from '@kbn/es-query';

import { KibanaLogic } from '../../../../shared/kibana/kibana_logic';

import {
  AnalyticsCollectionToolbarLogic,
  AnalyticsCollectionToolbarLogicValues,
} from './analytics_collection_toolbar_logic';

jest.mock('../../../../shared/kibana/kibana_logic', () => ({
  KibanaLogic: {
    values: {
      data: {
        dataViews: {
          find: jest.fn(() => Promise.resolve([{ id: 'some-data-view-id' }])),
        },
        search: {
          session: {
            start: jest.fn(() => 'some-search-session-id'),
          },
        },
      },
    },
  },
}));

describe('AnalyticsCollectionToolbarLogic', () => {
  const { mount } = new LogicMounter(AnalyticsCollectionToolbarLogic);

  beforeEach(() => {
    jest.clearAllMocks();

    mount();
  });
  const defaultProps: AnalyticsCollectionToolbarLogicValues = {
    _searchSessionId: null,
    refreshInterval: { pause: true, value: 10000 },
    searchSessionId: undefined,
    timeRange: { from: 'now-7d', to: 'now' },
  };

  it('initializes with default values', () => {
    expect(AnalyticsCollectionToolbarLogic.values).toEqual(defaultProps);
  });

  describe('reducers', () => {
    it('sets _searchSessionId', () => {
      AnalyticsCollectionToolbarLogic.actions.setSearchSessionId('sample_search_session_id');
      expect(AnalyticsCollectionToolbarLogic.values._searchSessionId).toEqual(
        'sample_search_session_id'
      );
    });

    it('sets refreshInterval', () => {
      const refreshInterval: RefreshInterval = { pause: false, value: 5000 };
      AnalyticsCollectionToolbarLogic.actions.setRefreshInterval(refreshInterval);
      expect(AnalyticsCollectionToolbarLogic.values.refreshInterval).toEqual(refreshInterval);
    });

    it('sets timeRange', () => {
      const timeRange: TimeRange = { from: 'now-30d', to: 'now' };
      AnalyticsCollectionToolbarLogic.actions.setTimeRange(timeRange);
      expect(AnalyticsCollectionToolbarLogic.values.timeRange).toEqual(timeRange);
    });
  });

  describe('listeners', () => {
    it('should set searchSessionId when onTimeRefresh called', () => {
      jest.spyOn(AnalyticsCollectionToolbarLogic.actions, 'setSearchSessionId');

      AnalyticsCollectionToolbarLogic.actions.onTimeRefresh();

      expect(KibanaLogic.values.data?.search.session.start).toHaveBeenCalled();
      expect(AnalyticsCollectionToolbarLogic.actions.setSearchSessionId).toHaveBeenCalledWith(
        'some-search-session-id'
      );
    });

    it('should clear searchSessionId when refreshInterval is on pause', () => {
      jest.spyOn(AnalyticsCollectionToolbarLogic.actions, 'setSearchSessionId');

      AnalyticsCollectionToolbarLogic.actions.setRefreshInterval({ pause: true, value: 10000 });

      expect(AnalyticsCollectionToolbarLogic.actions.setSearchSessionId).toHaveBeenCalledWith(null);
    });

    it('should call setSearchSessionId with null when setTimeRange called', () => {
      jest.spyOn(AnalyticsCollectionToolbarLogic.actions, 'setSearchSessionId');

      AnalyticsCollectionToolbarLogic.actions.setTimeRange({ from: 'now-7d', to: 'now' });

      expect(AnalyticsCollectionToolbarLogic.actions.setSearchSessionId).toHaveBeenCalledWith(null);
    });
  });

  describe('selectors', () => {
    it('should select the searchSessionId', () => {
      const mockId = 'test-id';
      AnalyticsCollectionToolbarLogic.actions.setSearchSessionId(mockId);

      expect(AnalyticsCollectionToolbarLogic.values.searchSessionId).toEqual(mockId);
    });

    it('should return undefined when searchSessionId is nulll', () => {
      AnalyticsCollectionToolbarLogic.actions.setSearchSessionId(null);

      expect(AnalyticsCollectionToolbarLogic.values.searchSessionId).toEqual(undefined);
    });
  });
});

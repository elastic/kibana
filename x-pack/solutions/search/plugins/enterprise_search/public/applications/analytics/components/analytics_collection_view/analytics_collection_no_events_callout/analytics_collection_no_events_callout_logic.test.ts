/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { Status } from '../../../../../../common/types/api';

import { AnalyticsCollectionNoEventsCalloutLogic } from './analytics_collection_no_events_callout_logic';

describe('analyticsEventsExistLogic', () => {
  const { mount } = new LogicMounter(AnalyticsCollectionNoEventsCalloutLogic);
  const indexName = true;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  const DEFAULT_VALUES = {
    data: undefined,
    hasEvents: false,
    isLoading: false,
    status: Status.IDLE,
  };

  it('has expected default values', () => {
    expect(AnalyticsCollectionNoEventsCalloutLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('selectors', () => {
    it('updates when apiSuccess listener triggered', () => {
      AnalyticsCollectionNoEventsCalloutLogic.actions.apiSuccess({ exists: indexName });

      expect(AnalyticsCollectionNoEventsCalloutLogic.values).toEqual({
        ...DEFAULT_VALUES,
        data: { exists: indexName },
        hasEvents: true,
        isLoading: false,
        status: Status.SUCCESS,
      });
    });
  });
});

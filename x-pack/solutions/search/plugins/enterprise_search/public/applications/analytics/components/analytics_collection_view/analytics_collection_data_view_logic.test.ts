/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { DataView } from '@kbn/data-views-plugin/common';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { findOrCreateDataView } from '../../utils/find_or_create_data_view';

import { AnalyticsCollectionDataViewLogic } from './analytics_collection_data_view_logic';
import { FetchAnalyticsCollectionLogic } from './fetch_analytics_collection_logic';

jest.mock('../../utils/find_or_create_data_view', () => {
  return {
    findOrCreateDataView: jest.fn(),
  };
});

describe('AnalyticsCollectionDataViewLogic', () => {
  const { mount } = new LogicMounter(AnalyticsCollectionDataViewLogic);

  beforeEach(() => {
    jest.clearAllMocks();

    mount();
  });

  const defaultProps = {
    dataView: null,
  };

  it('initializes with default values', () => {
    expect(AnalyticsCollectionDataViewLogic.values).toEqual(defaultProps);
  });

  describe('reducers', () => {
    it('should handle set dataView', () => {
      const dataView = { id: 'test' } as DataView;
      AnalyticsCollectionDataViewLogic.actions.setDataView(dataView);
      expect(AnalyticsCollectionDataViewLogic.values.dataView).toBe(dataView);
    });
  });

  describe('listeners', () => {
    it('should find and set dataView when analytics collection fetched', async () => {
      const dataView = { id: 'test' } as DataView;
      (findOrCreateDataView as jest.Mock).mockResolvedValue(dataView);

      await FetchAnalyticsCollectionLogic.actions.apiSuccess({
        events_datastream: 'events1',
        name: 'collection1',
      } as AnalyticsCollection);

      expect(AnalyticsCollectionDataViewLogic.values.dataView).toEqual(dataView);
    });

    it('should create, save and set dataView when analytics collection fetched but dataView is not found', async () => {
      const dataView = { id: 'test' } as DataView;
      (findOrCreateDataView as jest.Mock).mockResolvedValue(dataView);

      await FetchAnalyticsCollectionLogic.actions.apiSuccess({
        events_datastream: 'events1',
        name: 'collection1',
      } as AnalyticsCollection);

      expect(AnalyticsCollectionDataViewLogic.values.dataView).toEqual(dataView);
    });
  });
});

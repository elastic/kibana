/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';

import { AnalyticsCollection } from '../../../../common/types/analytics';
import { KibanaLogic } from '../../shared/kibana/kibana_logic';

import { findOrCreateDataView } from './find_or_create_data_view';

jest.mock('../../shared/kibana/kibana_logic', () => ({
  KibanaLogic: {
    values: {
      data: {
        dataViews: {
          createAndSave: jest.fn(),
          find: jest.fn(() => Promise.resolve([])),
        },
      },
    },
  },
}));

describe('findOrCreateDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should find and set dataView when analytics collection fetched', async () => {
    const dataView = { id: 'test', title: 'events1' } as DataView;
    if (KibanaLogic.values.data) {
      jest.spyOn(KibanaLogic.values.data.dataViews, 'find').mockResolvedValueOnce([dataView]);
    }

    expect(
      await findOrCreateDataView({
        events_datastream: 'events1',
        name: 'collection1',
      } as AnalyticsCollection)
    ).toEqual(dataView);
    expect(KibanaLogic.values.data?.dataViews.createAndSave).not.toHaveBeenCalled();
  });

  it('should create, save and set dataView when analytics collection fetched but dataView is not found', async () => {
    const dataView = { id: 'test21' } as DataView;
    if (KibanaLogic.values.data) {
      jest
        .spyOn(KibanaLogic.values.data.dataViews, 'createAndSave')
        .mockResolvedValueOnce(dataView);
    }

    expect(
      await findOrCreateDataView({
        events_datastream: 'events1',
        name: 'collection1',
      } as AnalyticsCollection)
    ).toEqual(dataView);
    expect(KibanaLogic.values.data?.dataViews.createAndSave).toHaveBeenCalled();
  });
});

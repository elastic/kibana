/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic, DataView } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { createExploreDataView } from './create_explore_data_view';
import { DEFAULT_TIME_FIELD, EXPLORE_DATA_VIEW_PREFIX } from '../../../common/constants';
import { SECURITY_SOLUTION_EXPLORE_DATA_VIEW } from '../components/data_view_picker/translations';

describe('createExploreDataView', () => {
  let mockDataViews: Partial<DataViewsServicePublic>;
  let mockSpaces: Partial<SpacesPluginStart>;
  const mockCreatedDataView = { id: 'explore-dv', title: 'some-title' } as unknown as DataView;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataViews = {
      create: jest.fn().mockResolvedValue(mockCreatedDataView),
    };
    mockSpaces = {
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'space1' }),
    };
  });

  it('creates an explore data view with expected id, name, title, timeFieldName and managed=true', async () => {
    const defaultPatterns = ['pattern-1', 'alerts-pattern', 'pattern-2'];
    const alertsPattern = 'alerts-pattern';

    const result = await createExploreDataView(
      {
        dataViews: mockDataViews as DataViewsServicePublic,
        spaces: mockSpaces as SpacesPluginStart,
      },
      defaultPatterns,
      alertsPattern
    );

    expect(result).toBe(mockCreatedDataView);
    expect(mockSpaces.getActiveSpace).toHaveBeenCalled();
    expect(mockDataViews.create).toHaveBeenCalledTimes(1);
    expect(mockDataViews.create).toHaveBeenCalledWith({
      id: `${EXPLORE_DATA_VIEW_PREFIX}-space1`,
      name: SECURITY_SOLUTION_EXPLORE_DATA_VIEW,
      timeFieldName: DEFAULT_TIME_FIELD,
      title: ['pattern-1', 'pattern-2'].join(),
      managed: true,
    });
  });

  it('filters out the alerts pattern and handles when there are no remaining patterns (title becomes empty string)', async () => {
    const defaultPatterns = ['alerts-pattern'];
    const alertsPattern = 'alerts-pattern';

    const result = await createExploreDataView(
      {
        dataViews: mockDataViews as DataViewsServicePublic,
        spaces: mockSpaces as SpacesPluginStart,
      },
      defaultPatterns,
      alertsPattern
    );

    expect(result).toBe(mockCreatedDataView);
    expect(mockDataViews.create).toHaveBeenCalledWith({
      id: `${EXPLORE_DATA_VIEW_PREFIX}-space1`,
      name: SECURITY_SOLUTION_EXPLORE_DATA_VIEW,
      timeFieldName: DEFAULT_TIME_FIELD,
      title: '',
      managed: true,
    });
  });

  it('propagates errors from dataViews.create', async () => {
    const error = new Error('create failed');
    mockDataViews.create = jest.fn().mockRejectedValue(error);

    await expect(
      createExploreDataView(
        {
          dataViews: mockDataViews as DataViewsServicePublic,
          spaces: mockSpaces as SpacesPluginStart,
        },
        ['pattern-1'],
        'alerts-pattern'
      )
    ).rejects.toThrow(error);

    expect(mockSpaces.getActiveSpace).toHaveBeenCalled();
    expect(mockDataViews.create).toHaveBeenCalled();
  });
});

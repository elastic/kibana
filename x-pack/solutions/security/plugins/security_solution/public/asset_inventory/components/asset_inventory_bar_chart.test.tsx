/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_FIELDS } from '../constants';
import { handleElementClick } from './asset_inventory_bar_chart';

describe('handleElementClick', () => {
  it('should call setQuery with the correct filters', () => {
    const setQuery = jest.fn();

    const mockDatum = {
      [ASSET_FIELDS.ENTITY_TYPE]: 'host_type',
      [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'host_sub_type',
      count: 1,
    };

    const mockGeometryValue = {
      value: 'geometry-value',
      datum: mockDatum,
    };

    const mockSeriesIdentifier = {
      key: 'series-identifier',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements: Array<[any, any]> = [[mockGeometryValue, mockSeriesIdentifier]];

    const mockIndexId = 'mock-index-id';

    handleElementClick(elements, setQuery, mockIndexId);

    expect(setQuery).toHaveBeenCalledWith({
      filters: [
        expect.objectContaining({
          meta: expect.objectContaining({
            key: 'entity.type',
            params: { query: 'host_type' },
          }),
        }),
        expect.objectContaining({
          meta: expect.objectContaining({
            key: 'entity.sub_type',
            params: { query: 'host_sub_type' },
          }),
        }),
      ],
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

const mockUseIndicesNav = jest.fn().mockReturnValue([]);

jest.mock('react-router-dom', () => ({
  useParams: () => ({}),
}));

jest.mock('./indices/indices_nav', () => ({
  useIndicesNav: (...args: any[]) => mockUseIndicesNav(...args),
}));

import { shallow } from 'enzyme';

import { SearchIndex } from './search_index';

const mockValues = {
  hasFilteringFeature: false,
  updateSideNavDefinition: jest.fn(),
};

describe('SearchIndex', () => {
  it('updates the side nav dynamic links', async () => {
    const updateSideNavDefinition = jest.fn();

    setMockValues({ ...mockValues, updateSideNavDefinition });

    const indicesItems = [{ foo: 'bar' }];
    mockUseIndicesNav.mockReturnValueOnce(indicesItems);

    shallow(<SearchIndex />);

    expect(updateSideNavDefinition).toHaveBeenCalledWith({
      indices: indicesItems,
    });
  });
});

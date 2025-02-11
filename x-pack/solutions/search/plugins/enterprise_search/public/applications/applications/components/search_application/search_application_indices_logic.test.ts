/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { EnterpriseSearchApplicationDetails } from '../../../../../common/types/search_applications';
import { FetchSearchApplicationApiLogic } from '../../api/search_applications/fetch_search_application_api_logic';

import {
  SearchApplicationIndicesLogic,
  SearchApplicationIndicesLogicValues,
} from './search_application_indices_logic';

const DEFAULT_VALUES: SearchApplicationIndicesLogicValues = {
  addIndicesFlyoutOpen: false,
  isLoadingSearchApplication: true,
  searchApplicationData: undefined,
  searchApplicationName: 'my-test-search-application',
};

const mockSearchApplicationData: EnterpriseSearchApplicationDetails = {
  indices: [
    {
      count: 10,
      health: 'green',
      name: 'search-001',
    },
    {
      count: 1000,
      health: 'yellow',
      name: 'search-002',
    },
  ],
  name: DEFAULT_VALUES.searchApplicationName,
  template: {
    script: {
      source: '"query":{"term":{"{{field_name}}":["{{field_value}}"',
      lang: 'mustache',
      options: { content_type: 'application/json;charset=utf-8' },
      params: {
        field_name: 'hello',
        field_value: 'world',
      },
    },
  },
  updated_at_millis: 1679501369566,
};

describe('SearchApplicationViewLogic', () => {
  const { mount } = new LogicMounter(SearchApplicationIndicesLogic);
  const { mount: mountFetchSearchApplicationApiLogic } = new LogicMounter(
    FetchSearchApplicationApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mountFetchSearchApplicationApiLogic();
    mount(
      {
        searchApplicationName: DEFAULT_VALUES.searchApplicationName,
      },
      {
        searchApplicationName: DEFAULT_VALUES.searchApplicationName,
      }
    );
  });

  it('has expected default values', () => {
    expect(SearchApplicationIndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    beforeEach(() => {
      FetchSearchApplicationApiLogic.actions.apiSuccess(mockSearchApplicationData);
    });
    it('has search application data', () => {
      expect(SearchApplicationIndicesLogic.values.searchApplicationData).toEqual(
        mockSearchApplicationData
      );
    });

    describe('searchApplicationUpdated', () => {
      it('fetches new search application details', () => {
        jest.spyOn(SearchApplicationIndicesLogic.actions, 'fetchSearchApplication');

        SearchApplicationIndicesLogic.actions.searchApplicationUpdated({
          ...mockSearchApplicationData,
          indices: mockSearchApplicationData.indices.map((index) => index.name),
        });

        expect(SearchApplicationIndicesLogic.actions.fetchSearchApplication).toHaveBeenCalledTimes(
          1
        );
        expect(SearchApplicationIndicesLogic.actions.fetchSearchApplication).toHaveBeenCalledWith({
          name: DEFAULT_VALUES.searchApplicationName,
        });
      });
    });
    describe('removeIndexFromSearchApplication', () => {
      it('updated search application removing the given index', () => {
        jest.spyOn(SearchApplicationIndicesLogic.actions, 'updateSearchApplicationRequest');

        SearchApplicationIndicesLogic.actions.removeIndexFromSearchApplication(
          mockSearchApplicationData.indices[0].name
        );

        expect(
          SearchApplicationIndicesLogic.actions.updateSearchApplicationRequest
        ).toHaveBeenCalledTimes(1);
        expect(
          SearchApplicationIndicesLogic.actions.updateSearchApplicationRequest
        ).toHaveBeenCalledWith({
          name: DEFAULT_VALUES.searchApplicationName,
          indices: ['search-002'],
          template: mockSearchApplicationData.template,
        });
      });
    });
    describe('addIndicesToSearchApplication', () => {
      it('updated search application removing the given index', () => {
        jest.spyOn(SearchApplicationIndicesLogic.actions, 'updateSearchApplicationRequest');

        SearchApplicationIndicesLogic.actions.addIndicesToSearchApplication(['search-003']);

        expect(
          SearchApplicationIndicesLogic.actions.updateSearchApplicationRequest
        ).toHaveBeenCalledTimes(1);
        expect(
          SearchApplicationIndicesLogic.actions.updateSearchApplicationRequest
        ).toHaveBeenCalledWith({
          name: DEFAULT_VALUES.searchApplicationName,
          indices: ['search-001', 'search-002', 'search-003'],
          template: mockSearchApplicationData.template,
        });
      });
    });
  });
});

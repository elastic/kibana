/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { DEFAULT_META } from '../../../../shared/constants';

import { itShowsServerErrorAsFlashMessage } from '../../../../test_helpers';

import { SuggestionsAPIResponse, SuggestionsLogic } from './suggestions_logic';

const DEFAULT_VALUES = {
  dataLoading: true,
  suggestions: [],
  meta: {
    ...DEFAULT_META,
    page: {
      ...DEFAULT_META.page,
      size: 10,
    },
  },
};

const MOCK_RESPONSE: SuggestionsAPIResponse = {
  meta: {
    page: {
      current: 1,
      size: 10,
      total_results: 1,
      total_pages: 1,
    },
  },
  results: [
    {
      query: 'foo',
      updated_at: '2021-07-08T14:35:50Z',
      promoted: ['1', '2'],
      status: 'applied',
      operation: 'create',
    },
  ],
};

describe('SuggestionsLogic', () => {
  const { mount } = new LogicMounter(SuggestionsLogic);
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(SuggestionsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onSuggestionsLoaded', () => {
      it('should set suggestion, meta state, & dataLoading to false', () => {
        mount();

        SuggestionsLogic.actions.onSuggestionsLoaded(MOCK_RESPONSE);

        expect(SuggestionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          suggestions: MOCK_RESPONSE.results,
          meta: MOCK_RESPONSE.meta,
          dataLoading: false,
        });
      });
    });

    describe('onPaginate', () => {
      it('should update meta', () => {
        mount();

        SuggestionsLogic.actions.onPaginate(2);

        expect(SuggestionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: {
            ...DEFAULT_META,
            page: {
              ...DEFAULT_META.page,
              current: 2,
            },
          },
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadSuggestions', () => {
      it('should set dataLoading state', () => {
        mount({ dataLoading: false });

        SuggestionsLogic.actions.loadSuggestions();

        expect(SuggestionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and set suggestions & meta state', async () => {
        http.post.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(SuggestionsLogic.actions, 'onSuggestionsLoaded');

        SuggestionsLogic.actions.loadSuggestions();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/suggestions',
          {
            body: JSON.stringify({
              page: {
                current: 1,
                size: 10,
              },
              filters: {
                status: ['pending'],
                type: 'curation',
              },
            }),
          }
        );

        expect(SuggestionsLogic.actions.onSuggestionsLoaded).toHaveBeenCalledWith(MOCK_RESPONSE);
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        mount();
        SuggestionsLogic.actions.loadSuggestions();
      });
    });
  });
});

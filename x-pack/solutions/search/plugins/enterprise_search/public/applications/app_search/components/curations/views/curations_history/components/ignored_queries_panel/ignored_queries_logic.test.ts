/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../../../../../__mocks__/kea_logic';
import '../../../../../../__mocks__/engine_logic.mock';
import { DEFAULT_META } from '../../../../../../../shared/constants';
import { itShowsServerErrorAsFlashMessage } from '../../../../../../../test_helpers';

// I don't know why eslint is saying this line is out of order
// eslint-disable-next-line import/order
import { nextTick } from '@kbn/test-jest-helpers';

import { IgnoredQueriesLogic } from './ignored_queries_logic';

const DEFAULT_VALUES = {
  dataLoading: true,
  ignoredQueries: [],
  meta: {
    ...DEFAULT_META,
    page: {
      ...DEFAULT_META.page,
      size: 10,
    },
  },
};

describe('IgnoredQueriesLogic', () => {
  const { mount } = new LogicMounter(IgnoredQueriesLogic);
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(IgnoredQueriesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onIgnoredQueriesLoad', () => {
      it('should set queries, meta state, & dataLoading to false', () => {
        IgnoredQueriesLogic.actions.onIgnoredQueriesLoad(['first query', 'second query'], {
          page: {
            current: 1,
            size: 10,
            total_results: 1,
            total_pages: 1,
          },
        });

        expect(IgnoredQueriesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          ignoredQueries: ['first query', 'second query'],
          meta: {
            page: {
              current: 1,
              size: 10,
              total_results: 1,
              total_pages: 1,
            },
          },
          dataLoading: false,
        });
      });
    });

    describe('onPaginate', () => {
      it('should update meta', () => {
        IgnoredQueriesLogic.actions.onPaginate(2);

        expect(IgnoredQueriesLogic.values).toEqual({
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
    describe('loadIgnoredQueries', () => {
      it('should make an API call and set suggestions & meta state', async () => {
        mount({ ...DEFAULT_VALUES, dataLoading: false });
        http.post.mockReturnValueOnce(
          Promise.resolve({
            results: [{ query: 'first query' }, { query: 'second query' }],
            meta: {
              page: {
                current: 1,
                size: 10,
                total_results: 1,
                total_pages: 1,
              },
            },
          })
        );
        jest.spyOn(IgnoredQueriesLogic.actions, 'onIgnoredQueriesLoad');

        IgnoredQueriesLogic.actions.loadIgnoredQueries();
        expect(IgnoredQueriesLogic.values).toEqual({ ...DEFAULT_VALUES, dataLoading: true });

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
                status: ['disabled'],
                type: 'curation',
              },
            }),
          }
        );

        expect(IgnoredQueriesLogic.actions.onIgnoredQueriesLoad).toHaveBeenCalledWith(
          ['first query', 'second query'],
          {
            page: {
              current: 1,
              size: 10,
              total_results: 1,
              total_pages: 1,
            },
          }
        );
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        mount();
        IgnoredQueriesLogic.actions.loadIgnoredQueries();
      });
    });

    describe('allowIgnoredQuery', () => {
      it('will make an http call to reject the suggestion for the query', async () => {
        http.put.mockReturnValueOnce(
          Promise.resolve({
            results: [
              {
                query: 'test query',
                type: 'curation',
                status: 'rejected',
              },
            ],
          })
        );

        IgnoredQueriesLogic.actions.allowIgnoredQuery('test query');
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/suggestions',
          {
            body: JSON.stringify([
              {
                query: 'test query',
                type: 'curation',
                status: 'rejected',
              },
            ]),
          }
        );

        expect(flashSuccessToast).toHaveBeenCalledWith(expect.any(String));
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        mount();
        IgnoredQueriesLogic.actions.allowIgnoredQuery('test query');
      });

      it('handles inline errors', async () => {
        http.put.mockReturnValueOnce(
          Promise.resolve({
            results: [
              {
                error: 'error',
              },
            ],
          })
        );

        IgnoredQueriesLogic.actions.allowIgnoredQuery('test query');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});

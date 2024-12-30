/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StackTracesDisplayOption, TopNType } from '@kbn/profiling-utils';
import { getTracesViewRouteParams } from './utils';

describe('stack traces view utils', () => {
  describe('getTracesViewRouteParams', () => {
    it('filters by category only', () => {
      expect(
        getTracesViewRouteParams({
          query: {
            rangeFrom: 'now-15m',
            rangeTo: 'now',
            displayAs: StackTracesDisplayOption.StackTraces,
            kuery: '',
            limit: 10,
          },
          topNType: TopNType.Traces,
          category: 'Foo',
        })
      ).toEqual({
        path: { topNType: 'traces' },
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          displayAs: 'stackTraces',
          kuery: 'Stacktrace.id:"Foo"',
          limit: 10,
        },
      });
    });

    it('keeps current filter and adds category', () => {
      expect(
        getTracesViewRouteParams({
          query: {
            rangeFrom: 'now-15m',
            rangeTo: 'now',
            displayAs: StackTracesDisplayOption.StackTraces,
            kuery: 'container.name:"bar"',
            limit: 10,
          },
          topNType: TopNType.Traces,
          category: 'Foo',
        })
      ).toEqual({
        path: { topNType: 'traces' },
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          displayAs: 'stackTraces',
          kuery: '(container.name:"bar") AND Stacktrace.id:"Foo"',
          limit: 10,
        },
      });
    });
  });
});

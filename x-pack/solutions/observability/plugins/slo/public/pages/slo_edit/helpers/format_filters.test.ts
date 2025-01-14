/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGroupByCardinalityFilters } from '../components/indicator_section/synthetics_availability/synthetics_availability_indicator_type_form';
import { formatAllFilters } from './format_filters';

describe('formatAllFilters', () => {
  const monitorIds = ['1234'];
  const tags = ['tag1', 'tag2'];
  const projects = ['project1', 'project2'];
  const cardinalityFilters = getGroupByCardinalityFilters(monitorIds, projects, tags);

  it('handles global kql filter', () => {
    const kqlFilter = 'monitor.id: "1234"';
    expect(formatAllFilters(kqlFilter, cardinalityFilters)).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'monitor.id',
            negate: false,
            params: ['1234'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'monitor.id': '1234',
                  },
                },
              ],
            },
          },
        },
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'monitor.project.id',
            negate: false,
            params: ['project1', 'project2'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'monitor.project.id': 'project1',
                  },
                },
                {
                  match_phrase: {
                    'monitor.project.id': 'project2',
                  },
                },
              ],
            },
          },
        },
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'tags',
            negate: false,
            params: ['tag1', 'tag2'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    tags: 'tag1',
                  },
                },
                {
                  match_phrase: {
                    tags: 'tag2',
                  },
                },
              ],
            },
          },
        },
      ],
      kqlQuery: 'monitor.id: "1234"',
    });
  });

  it('handles global filters meta ', () => {
    const globalFilters = {
      filters: [
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'monitor.name',
            negate: false,
            params: ['test name'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'monitor.name': 'test name',
                  },
                },
              ],
            },
          },
        },
      ],
      kqlQuery: 'monitor.id: "1234"',
    };
    expect(formatAllFilters(globalFilters, cardinalityFilters)).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'monitor.name',
            negate: false,
            params: ['test name'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'monitor.name': 'test name',
                  },
                },
              ],
            },
          },
        },
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'monitor.id',
            negate: false,
            params: ['1234'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'monitor.id': '1234',
                  },
                },
              ],
            },
          },
        },
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'monitor.project.id',
            negate: false,
            params: ['project1', 'project2'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'monitor.project.id': 'project1',
                  },
                },
                {
                  match_phrase: {
                    'monitor.project.id': 'project2',
                  },
                },
              ],
            },
          },
        },
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'tags',
            negate: false,
            params: ['tag1', 'tag2'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    tags: 'tag1',
                  },
                },
                {
                  match_phrase: {
                    tags: 'tag2',
                  },
                },
              ],
            },
          },
        },
      ],
      kqlQuery: 'monitor.id: "1234"',
    });
  });
});

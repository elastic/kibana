/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';
import {
  threatMappingEntriesAreValid,
  buildThreatMappingFilter,
  createInnerAndClauses,
  createNamedAndClause,
  buildEntriesMappingFilter,
} from './build_threat_mapping_filter';
import {
  getThreatMappingMock,
  getThreatListItemMock,
  getThreatMappingFilterMock,
  getThreatMappingFilterShouldMock,
  getThreatListSearchResponseMock,
  getThreatMappingEntriesMockWithNegate,
  getAndClauseMock,
  getThreatMappingEntriesMock,
} from './build_threat_mapping_filter.mock';
import type { BooleanFilter, ThreatListItem, ThreatMappingEntries } from './types';

describe('build_threat_mapping_filter', () => {
  describe('buildThreatMappingFilter', () => {
    test('it should create the correct entries when using the default mocks', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock().hits.hits;
      const filter = buildThreatMappingFilter({
        threatMappings: threatMapping,
        threatList,
        entryKey: 'value',
      });
      expect(filter).toEqual(getThreatMappingFilterMock());
    });

    test('it should not mutate the original threatMapping', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock().hits.hits;
      buildThreatMappingFilter({ threatMappings: threatMapping, threatList, entryKey: 'value' });
      expect(threatMapping).toEqual(getThreatMappingMock());
    });

    test('it should not mutate the original threatListItem', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock().hits.hits;
      buildThreatMappingFilter({ threatMappings: threatMapping, threatList, entryKey: 'value' });
      expect(threatList).toEqual(getThreatListSearchResponseMock().hits.hits);
    });
  });

  describe('threatMappingEntriesAreValid', () => {
    test('should return true when using the default mocks', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = getThreatListItemMock();

      const result = threatMappingEntriesAreValid({
        threatMappingEntries: threatMapping[0].entries,
        threatListItem,
        entryKey: 'value',
      });
      expect(result).toEqual(true);
    });

    test('it should not mutate the original threatListItem', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = getThreatListItemMock();

      threatMappingEntriesAreValid({
        threatMappingEntries: threatMapping[0].entries,
        threatListItem,
        entryKey: 'value',
      });
      expect(threatListItem).toEqual(getThreatListSearchResponseMock().hits.hits[0]);
    });

    test('it should remove the entire "AND" clause if one of the pieces of data is missing from the list', () => {
      const result = threatMappingEntriesAreValid({
        threatMappingEntries: [
          {
            field: 'host.name',
            type: 'mapping',
            value: 'host.name',
          },
          {
            field: 'host.ip',
            type: 'mapping',
            value: 'host.ip',
          },
        ],
        threatListItem: getThreatListItemMock({
          _source: {
            '@timestamp': '2020-09-09T21:59:13Z',
            host: {
              name: 'host-1',
              // since ip is missing this entire AND clause should be dropped
            },
          },
          fields: {
            '@timestamp': ['2020-09-09T21:59:13Z'],
            'host.name': ['host-1'],
          },
        }),
        entryKey: 'value',
      });
      expect(result).toEqual(false);
    });
  });

  describe('createInnerAndClauses', () => {
    test('it should return two clauses given a single entry', () => {
      const [{ entries: threatMappingEntries }] = getThreatMappingMock(); // get the first element
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({
        threatMappingEntries,
        threatListItem,
        entryKey: 'value',
      });
      const {
        bool: {
          should: [
            {
              bool: { filter },
            },
          ],
        },
      } = getThreatMappingFilterShouldMock();
      expect(innerClause).toEqual(filter);
    });

    test('it should create a correct query for negate=true mapping entry', () => {
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({
        threatMappingEntries: [
          {
            field: 'host.name',
            type: 'mapping',
            value: 'host.name',
          },
          {
            field: 'host.ip',
            type: 'mapping',
            value: 'host.ip',
            negate: true,
          },
        ],
        threatListItem,
        entryKey: 'value',
      });

      expect(innerClause).toEqual([
        {
          match: {
            'host.name': {
              query: 'host-1',
            },
          },
        },
        {
          bool: {
            must_not: { match: { 'host.ip': { query: '192.168.0.0.1' } } },
          },
        },
      ]);
    });

    test('it should create a correct query for negate=true mapping entry when not matching field is undefined', () => {
      const threatListItem = getThreatListItemMock({ fields: { 'host.name': ['host-a'] } });
      const innerClause = createInnerAndClauses({
        threatMappingEntries: [
          {
            field: 'host.name',
            type: 'mapping',
            value: 'host.name',
          },
          {
            field: 'host.ip',
            type: 'mapping',
            value: 'host.ip',
            negate: true,
          },
        ],
        threatListItem,
        entryKey: 'value',
      });

      expect(innerClause).toEqual([
        {
          match: {
            'host.name': {
              query: 'host-a',
            },
          },
        },
        {
          exists: {
            field: 'host.ip',
          },
        },
      ]);
    });

    test('it should return an empty array given an empty array', () => {
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({
        threatMappingEntries: [],
        threatListItem,
        entryKey: 'value',
      });
      expect(innerClause).toEqual([]);
    });

    test('it should filter out a single unknown value', () => {
      const [{ entries }] = getThreatMappingMock(); // get the first element
      const threatMappingEntries: ThreatMappingEntries = [
        ...entries,
        {
          field: 'host.name', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
      ];
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({
        threatMappingEntries,
        threatListItem,
        entryKey: 'value',
      });
      const {
        bool: {
          should: [
            {
              bool: { filter },
            },
          ],
        },
      } = getThreatMappingFilterShouldMock(); // get the first element
      expect(innerClause).toEqual(filter);
    });

    test('it should filter out 2 unknown values', () => {
      const [{ entries }] = getThreatMappingMock(); // get the first element
      const threatMappingEntries: ThreatMappingEntries = [
        ...entries,
        {
          field: 'host.name', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
        {
          field: 'host.ip', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
      ];
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({
        threatMappingEntries,
        threatListItem,
        entryKey: 'value',
      });
      const {
        bool: {
          should: [
            {
              bool: { filter },
            },
          ],
        },
      } = getThreatMappingFilterShouldMock(); // get the first element
      expect(innerClause).toEqual(filter);
    });

    test('it should filter out all unknown values as an empty array', () => {
      const threatMappingEntries: ThreatMappingEntries = [
        {
          field: 'host.name', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
        {
          field: 'host.ip', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
      ];
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({
        threatMappingEntries,
        threatListItem,
        entryKey: 'value',
      });
      expect(innerClause).toEqual([]);
    });
  });

  describe('createNamedAndClause', () => {
    test('it should return all clauses given the entries', () => {
      const threatMappingEntries = getThreatMappingEntriesMockWithNegate();
      const threatListItem = getThreatListItemMock();
      const innerClause = createNamedAndClause({
        threatMappingEntries,
        threatMappingIndex: 0,
        threatListItem,
        entryKey: 'value',
      });
      expect(innerClause).toEqual(getAndClauseMock());
    });

    test('it should return undefined given an empty array', () => {
      const threatListItem = getThreatListItemMock();
      const innerClause = createNamedAndClause({
        threatMappingEntries: [],
        threatMappingIndex: 0,
        threatListItem,
        entryKey: 'value',
      });
      expect(innerClause).toEqual(undefined);
    });

    test('it should return undefined given an empty object for a threat list item', () => {
      const threatMappingEntries = getThreatMappingEntriesMock();
      const innerClause = createNamedAndClause({
        threatMappingEntries,
        threatMappingIndex: 0,
        threatListItem: getThreatListItemMock({ _source: {}, fields: {} }),
        entryKey: 'value',
      });
      expect(innerClause).toEqual(undefined);
    });
  });

  describe('buildEntriesMappingFilter', () => {
    test('it should return all clauses given the entries', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock().hits.hits;
      const mapping = buildEntriesMappingFilter({
        threatMappings: threatMapping,
        threatList,
        entryKey: 'value',
      });
      const expected: BooleanFilter = getThreatMappingFilterShouldMock();
      expect(mapping).toEqual(expected);
    });

    test('it should return empty "should" given an empty threat list', () => {
      const threatMapping = getThreatMappingMock();
      const threatList: ThreatListItem[] = [];
      const mapping = buildEntriesMappingFilter({
        threatMappings: threatMapping,
        threatList,
        entryKey: 'value',
      });
      const expected: BooleanFilter = {
        bool: { should: [], minimum_should_match: 1 },
      };
      expect(mapping).toEqual(expected);
    });

    test('it should return empty "should" given an empty threat mapping', () => {
      const threatList = getThreatListSearchResponseMock().hits.hits;
      const mapping = buildEntriesMappingFilter({
        threatMappings: [],
        threatList,
        entryKey: 'value',
      });
      const expected: BooleanFilter = {
        bool: { should: [], minimum_should_match: 1 },
      };
      expect(mapping).toEqual(expected);
    });

    test('it should ignore entries that are invalid', () => {
      const entries: ThreatMappingEntries = [
        {
          field: 'host.name',
          type: 'mapping',
          value: 'invalid',
        },
        {
          field: 'host.ip',
          type: 'mapping',
          value: 'invalid',
        },
      ];

      const threatMapping: ThreatMapping = [
        ...getThreatMappingMock(),
        ...[
          {
            entries,
          },
        ],
      ];
      const threatList = getThreatListSearchResponseMock().hits.hits;
      const mapping = buildEntriesMappingFilter({
        threatMappings: threatMapping,
        threatList,
        entryKey: 'value',
      });
      const expected: BooleanFilter = getThreatMappingFilterShouldMock();
      expect(mapping).toEqual(expected);
    });

    test('it should use terms query if allowedFieldsForTermsQuery provided', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock().hits.hits;
      const mapping = buildEntriesMappingFilter({
        threatMappings: threatMapping,
        threatList,
        entryKey: 'value',
        allowedFieldsForTermsQuery: {
          source: { 'source.ip': true },
          threat: { 'source.ip': true },
        },
      });
      const mock = getThreatMappingFilterShouldMock();
      mock.bool.should.pop();

      const expected: BooleanFilter = {
        bool: {
          should: [
            ...mock.bool.should,
            {
              terms: {
                _name: '__SEP____SEP__3__SEP__tq',
                'source.ip': ['127.0.0.1'],
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
      expect(mapping).toEqual(expected);
    });

    test('it should use match query if allowedFieldsForTermsQuery provided, but it is AND', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock().hits.hits;
      const mapping = buildEntriesMappingFilter({
        threatMappings: threatMapping,
        threatList,
        entryKey: 'value',
        allowedFieldsForTermsQuery: {
          source: { 'host.name': true, 'host.ip': true },
          threat: { 'host.name': true, 'host.ip': true },
        },
      });

      const expected: BooleanFilter = getThreatMappingFilterShouldMock();
      expect(mapping).toEqual(expected);
    });
  });
});

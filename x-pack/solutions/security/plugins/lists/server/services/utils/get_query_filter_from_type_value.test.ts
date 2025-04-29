/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryFilterType,
  getEmptyQuery,
  getQueryFilterFromTypeValue,
  getShouldQuery,
  getTermsQuery,
  getTextQuery,
} from './get_query_filter_from_type_value';

describe('get_query_filter_from_type_value', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueryFilterFromTypeValue', () => {
    test('it returns an ip if given an ip', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: ['127.0.0.1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ term: { ip: { _name: '0.0', value: '127.0.0.1' } } }],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it returns two ip if given two ip', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: ['127.0.0.1', '127.0.0.2'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              { term: { ip: { _name: '0.0', value: '127.0.0.1' } } },
              { term: { ip: { _name: '1.0', value: '127.0.0.2' } } },
            ],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it returns a keyword if given a keyword', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'keyword',
        value: ['host-name-1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ term: { keyword: { _name: '0.0', value: 'host-name-1' } } }],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it returns two keywords if given two values', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'keyword',
        value: ['host-name-1', 'host-name-2'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              { term: { keyword: { _name: '0.0', value: 'host-name-1' } } },
              { term: { keyword: { _name: '1.0', value: 'host-name-2' } } },
            ],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it returns an empty query given an empty value', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'keyword',
        value: [],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_none: {
                  _name: 'empty',
                },
              },
            ],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it returns an empty query object given an empty array', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: [],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_none: {
                  _name: 'empty',
                },
              },
            ],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it returns an empty query object given an array with only null values', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: [null, null],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_none: {
                  _name: 'empty',
                },
              },
            ],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it filters out a null value if mixed with a string value for non-text based query', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: [null, 'host-name-1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ term: { ip: { _name: '1.0', value: 'host-name-1' } } }],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it filters out an object value if mixed with a string value for non-text based query', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: [{}, 'host-name-1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ term: { ip: { _name: '1.0', value: 'host-name-1' } } }],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it filters out a null value if mixed with a string value for text based query', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'text',
        value: [null, 'host-name-1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ match: { text: { _name: '1.0', operator: 'and', query: 'host-name-1' } } }],
          },
        },
      ];
      expect(query).toEqual(expected);
    });

    test('it filters out object values if mixed with a string value for text based query', () => {
      const query = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'text',
        value: [{}, 'host-name-1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ match: { text: { _name: '1.0', operator: 'and', query: 'host-name-1' } } }],
          },
        },
      ];
      expect(query).toEqual(expected);
    });
  });

  describe('getEmptyQuery', () => {
    test('it returns an empty query given a list_id', () => {
      const emptyQuery = getEmptyQuery({ listId: 'list-123' });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        { bool: { minimum_should_match: 1, should: [{ match_none: { _name: 'empty' } }] } },
      ];
      expect(emptyQuery).toEqual(expected);
    });
  });

  describe('getTermsQuery', () => {
    describe('scalar values', () => {
      test('it returns a expected terms query give a single string value, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: ['127.0.0.1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ term: { ip: { _name: '0.0', value: '127.0.0.1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected terms query given two string values, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: ['127.0.0.1', '127.0.0.2'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { term: { ip: { _name: '0.0', value: '127.0.0.1' } } },
                { term: { ip: { _name: '1.0', value: '127.0.0.2' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected numeric terms without converting them into strings', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [5, 3],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { term: { ip: { _name: '0.0', value: 5 } } },
                { term: { ip: { _name: '1.0', value: 3 } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns a string and a numeric without converting them into a homogenous type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [5, '3'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { term: { ip: { _name: '0.0', value: 5 } } },
                { term: { ip: { _name: '1.0', value: '3' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out a null value if mixed with a string value', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [null, 'host-name-1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ term: { ip: { _name: '1.0', value: 'host-name-1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out an object value if mixed with a string value', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [{}, 'host-name-1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ term: { ip: { _name: '1.0', value: 'host-name-1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });
    });

    describe('array values', () => {
      test('it returns a expected terms query give a single string value, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [['127.0.0.1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '0.0', ip: ['127.0.0.1'] } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected terms query given two string values, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [['127.0.0.1'], ['127.0.0.2']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { terms: { _name: '0.0', ip: ['127.0.0.1'] } },
                { terms: { _name: '1.0', ip: ['127.0.0.2'] } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected numeric terms without converting them into strings', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[5], [3]],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '0.0', ip: [5] } }, { terms: { _name: '1.0', ip: [3] } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns a string and a numeric without converting them into a homogenous type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[5], ['3']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { terms: { _name: '0.0', ip: [5] } },
                { terms: { _name: '1.0', ip: ['3'] } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out a null value if mixed with a string value', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[null], ['host-name-1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '1.0', ip: ['host-name-1'] } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out an object value if mixed with a string value', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[{}], ['host-name-1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '1.0', ip: ['host-name-1'] } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it flattens and removes null values correctly in a deeply nested set of arrays', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [
            [null],
            [
              'host-name-1',
              ['host-name-2', [null], ['host-name-3'], ['host-name-4', null, 'host-name-5']],
            ],
            ['host-name-6'],
          ],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  terms: {
                    _name: '1.0',
                    ip: ['host-name-1', 'host-name-2', 'host-name-3', 'host-name-4', 'host-name-5'],
                  },
                },
                { terms: { _name: '2.0', ip: ['host-name-6'] } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });
    });
  });

  describe('getTextQuery', () => {
    describe('scalar values', () => {
      test('it returns a expected terms query give a single string value, listId, and type', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: ['127.0.0.1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ match: { ip: { _name: '0.0', operator: 'and', query: '127.0.0.1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected terms query given two string values, listId, and type', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: ['127.0.0.1', '127.0.0.2'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { ip: { _name: '0.0', operator: 'and', query: '127.0.0.1' } } },
                { match: { ip: { _name: '1.0', operator: 'and', query: '127.0.0.2' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected numeric terms without converting them into strings', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [5, 3],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { ip: { _name: '0.0', operator: 'and', query: 5 } } },
                { match: { ip: { _name: '1.0', operator: 'and', query: 3 } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns a string and a numeric without converting them into a homogenous type', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [5, '3'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { ip: { _name: '0.0', operator: 'and', query: 5 } } },
                { match: { ip: { _name: '1.0', operator: 'and', query: '3' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out a null value if mixed with a string value', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [null, 'host-name-1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ match: { ip: { _name: '1.0', operator: 'and', query: 'host-name-1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out an object value if mixed with a string value', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [{}, 'host-name-1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ match: { ip: { _name: '1.0', operator: 'and', query: 'host-name-1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });
    });

    describe('array values', () => {
      test('it returns a expected terms query give a single string value, listId, and type', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [['127.0.0.1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ match: { ip: { _name: '0.0', operator: 'and', query: '127.0.0.1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected terms query given two string values, listId, and type', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [['127.0.0.1'], ['127.0.0.2']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { ip: { _name: '0.0', operator: 'and', query: '127.0.0.1' } } },
                { match: { ip: { _name: '1.0', operator: 'and', query: '127.0.0.2' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected numeric terms without converting them into strings', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[5], [3]],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { ip: { _name: '0.0', operator: 'and', query: 5 } } },
                { match: { ip: { _name: '1.0', operator: 'and', query: 3 } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns a string and a numeric without converting them into a homogenous type', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[5], ['3']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { ip: { _name: '0.0', operator: 'and', query: 5 } } },
                { match: { ip: { _name: '1.0', operator: 'and', query: '3' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out a null value if mixed with a string value', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[null], ['host-name-1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ match: { ip: { _name: '1.0', operator: 'and', query: 'host-name-1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out a object value if mixed with a string value', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[{}], ['host-name-1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ match: { ip: { _name: '1.0', operator: 'and', query: 'host-name-1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it flattens and removes null values correctly in a deeply nested set of arrays', () => {
        const query = getTextQuery({
          listId: 'list-123',
          type: 'ip',
          value: [
            [null],
            [
              'host-name-1',
              ['host-name-2', [null], ['host-name-3'], ['host-name-4', null, 'host-name-5']],
            ],
            ['host-name-6'],
          ],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { ip: { _name: '1.0', operator: 'and', query: 'host-name-1' } } },
                { match: { ip: { _name: '1.1', operator: 'and', query: 'host-name-2' } } },
                { match: { ip: { _name: '1.2', operator: 'and', query: 'host-name-3' } } },
                { match: { ip: { _name: '1.3', operator: 'and', query: 'host-name-4' } } },
                { match: { ip: { _name: '1.4', operator: 'and', query: 'host-name-5' } } },
                { match: { ip: { _name: '2.0', operator: 'and', query: 'host-name-6' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });
    });
  });

  describe('getShouldQuery', () => {
    test('it returns a should as-is when passed one', () => {
      const query = getShouldQuery({
        listId: 'list-123',
        should: [
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '0.0', ip: ['127.0.0.1'] } }],
            },
          },
        ],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [{ terms: { _name: '0.0', ip: ['127.0.0.1'] } }],
                },
              },
            ],
          },
        },
      ];
      expect(query).toEqual(expected);
    });
  });
});

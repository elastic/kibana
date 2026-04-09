/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlToInfluencerQuery } from './kql_to_influencer_query';

function nestedTerm(fieldName: string, fieldValue?: string) {
  return {
    nested: {
      path: 'influencers',
      query: {
        bool: {
          filter: [
            { term: { 'influencers.influencer_field_name': fieldName } },
            ...(fieldValue !== undefined
              ? [{ term: { 'influencers.influencer_field_values': fieldValue } }]
              : []),
          ],
        },
      },
    },
  };
}

function nestedWildcard(fieldName: string, fieldValue: string) {
  return {
    nested: {
      path: 'influencers',
      query: {
        bool: {
          filter: [
            { term: { 'influencers.influencer_field_name': fieldName } },
            { wildcard: { 'influencers.influencer_field_values': fieldValue } },
          ],
        },
      },
    },
  };
}

describe('kqlToInfluencerQuery', () => {
  describe('returns undefined for empty input', () => {
    it.each([undefined, '', '  ', '\t\n'])('when input is %j', (input) => {
      expect(kqlToInfluencerQuery(input)).toBeUndefined();
    });
  });

  describe('simple field:value', () => {
    it('handles a quoted value', () => {
      const result = kqlToInfluencerQuery('service.name: "frontend"');
      expect(result).toEqual({
        bool: {
          should: [nestedTerm('service.name', 'frontend')],
          minimum_should_match: 1,
        },
      });
    });

    it('handles an unquoted value', () => {
      const result = kqlToInfluencerQuery('service.name: frontend');
      expect(result).toEqual({
        bool: {
          should: [nestedTerm('service.name', 'frontend')],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('AND logic', () => {
    it('combines two conditions with bool.filter', () => {
      const result = kqlToInfluencerQuery('service.name: "frontend" AND host.name: "server-1"');

      expect(result).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [nestedTerm('service.name', 'frontend')],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [nestedTerm('host.name', 'server-1')],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });
  });

  describe('OR logic', () => {
    it('combines two conditions with bool.should', () => {
      const result = kqlToInfluencerQuery('service.name: "frontend" OR host.name: "server-1"');

      expect(result).toEqual({
        bool: {
          should: [
            {
              bool: {
                should: [nestedTerm('service.name', 'frontend')],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [nestedTerm('host.name', 'server-1')],
                minimum_should_match: 1,
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('handles parenthesized value list shorthand', () => {
      const result = kqlToInfluencerQuery('service.name: ("frontend" OR "backend")');

      expect(result).toEqual({
        bool: {
          should: [
            {
              bool: {
                should: [nestedTerm('service.name', 'frontend')],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [nestedTerm('service.name', 'backend')],
                minimum_should_match: 1,
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('NOT logic', () => {
    it('wraps the inner query with bool.must_not', () => {
      const result = kqlToInfluencerQuery('NOT service.name: "frontend"');

      expect(result).toEqual({
        bool: {
          must_not: [
            {
              bool: {
                should: [nestedTerm('service.name', 'frontend')],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });
  });

  describe('exists query', () => {
    it('produces a nested query matching the influencer field name only', () => {
      const result = kqlToInfluencerQuery('service.name: *');

      expect(result).toEqual({
        bool: {
          should: [nestedTerm('service.name')],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('wildcard value', () => {
    it('uses a wildcard query for the influencer field value', () => {
      const result = kqlToInfluencerQuery('service.name: front*');

      expect(result).toEqual({
        bool: {
          should: [nestedWildcard('service.name', 'front*')],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('invalid KQL', () => {
    it('throws on malformed input', () => {
      expect(() => kqlToInfluencerQuery(':::')).toThrow();
    });
  });

  describe('unsupported KQL patterns (pass-through behavior)', () => {
    it('range query: passes through the range DSL unchanged', () => {
      const result = kqlToInfluencerQuery('service.name > "abc"');

      expect(result).toEqual({
        bool: {
          should: [{ range: { 'service.name': { gt: 'abc' } } }],
          minimum_should_match: 1,
        },
      });
    });

    it('field-less query: passes through multi_match DSL unchanged', () => {
      const result = kqlToInfluencerQuery('frontend');

      expect(result).toEqual({
        multi_match: {
          type: 'best_fields',
          query: 'frontend',
          lenient: true,
        },
      });
    });

    it('match-all (*: *): passes through match_all DSL unchanged', () => {
      const result = kqlToInfluencerQuery('*: *');

      expect(result).toEqual({ match_all: {} });
    });
  });
});

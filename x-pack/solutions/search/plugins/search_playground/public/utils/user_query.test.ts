/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateUserElasticSearchQuery, disableExecuteQuery } from './user_query';

describe('User Query utilities', () => {
  describe('validateUserElasticSearchQuery', () => {
    const sampleGeneratedElasticsearchQuery = {
      retriever: {
        standard: {
          query: {
            multi_match: {
              query: '{query}',
              fields: ['foo', 'bar', 'baz'],
            },
          },
        },
      },
    };
    it('should return false if userQuery is null', () => {
      expect(validateUserElasticSearchQuery(null, sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: false,
        isUserCustomized: false,
      });
    });
    it('should return valid false if userQuery is not a valid JSON', () => {
      const userQuery = `{
        "retriever": {
          "standard": {
            "query": {
              "multi_match": {
                "fields": ["foo", "bar", "baz"]
                "query": "{query}"
              }
            }
          }
        }
      }`;
      expect(validateUserElasticSearchQuery(userQuery, sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: false,
        isUserCustomized: true,
      });
    });
    it('should return valid false if userQuery is empty', () => {
      expect(validateUserElasticSearchQuery('', sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: false,
        isUserCustomized: true,
        userQueryErrors: [expect.any(String)],
      });
      expect(validateUserElasticSearchQuery('   ', sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: false,
        isUserCustomized: true,
        userQueryErrors: [expect.any(String)],
      });
    });
    it('should return customized false if queries are equal', () => {
      expect(
        validateUserElasticSearchQuery(
          JSON.stringify(sampleGeneratedElasticsearchQuery, null, 4),
          sampleGeneratedElasticsearchQuery
        )
      ).toEqual({
        isValid: true,
        isUserCustomized: false,
      });
    });
    it('should return customized false if queries are functionally equal', () => {
      const userQuery = `{
  "retriever": {
    "standard": {
      "query": {
        "multi_match": {
          "fields": ["foo", "bar", "baz"],
          "query": "{query}"
        }
      }
    }
  }
}`;
      expect(validateUserElasticSearchQuery(userQuery, sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: true,
        isUserCustomized: false,
      });
    });
    it('should return valid false if user query removes {query} placeholder', () => {
      const userQuery = `{
  "retriever": {
    "standard": {
      "query": {
        "multi_match": {
          "query": "test",
          "fields": ["foo"]
        }
      }
    }
  }
}`;
      expect(validateUserElasticSearchQuery(userQuery, sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: false,
        isUserCustomized: true,
        userQueryErrors: ['User query must contain "{query}"'],
      });
    });
    it('should include {query} placeholder error even when query is not valid JSON', () => {
      const userQuery = `invalid`;
      expect(validateUserElasticSearchQuery(userQuery, sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: false,
        isUserCustomized: true,
        userQueryErrors: [expect.any(String)],
      });
    });
  });
  describe('disableExecuteQuery', () => {
    it('should return true if query is null', () => {
      expect(disableExecuteQuery(undefined, null)).toEqual(true);
    });
    it('should return true if query is empty', () => {
      expect(disableExecuteQuery(undefined, '')).toEqual(true);
      expect(disableExecuteQuery(undefined, '   ')).toEqual(true);
    });
    it('should return true if query is undefined', () => {
      expect(disableExecuteQuery(undefined, undefined)).toEqual(true);
    });
    it('should return true if query is invalid', () => {
      const validations = {
        isValid: false,
        isUserCustomized: true,
      };
      expect(disableExecuteQuery(validations, 'test')).toEqual(true);
    });
    it('should return false if query is valid', () => {
      const validations = {
        isValid: true,
        isUserCustomized: true,
      };
      expect(disableExecuteQuery(validations, 'test')).toEqual(false);
    });
    it('should return false if query is valid and userCustomized is false', () => {
      const validations = {
        isValid: true,
        isUserCustomized: false,
      };
      expect(disableExecuteQuery(validations, 'test')).toEqual(false);
    });
    it('should return false if query is valid and userCustomized is true', () => {
      const validations = {
        isValid: true,
        isUserCustomized: true,
      };
      expect(disableExecuteQuery(validations, 'test')).toEqual(false);
    });
  });
});

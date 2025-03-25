/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateUserElasticSearchQuery } from './user_query';

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
    it('should return false if userQuery is undefined', () => {
      expect(validateUserElasticSearchQuery(undefined, sampleGeneratedElasticsearchQuery)).toEqual({
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
        userQueryErrors: ['User query must contain "{query}" placeholder'],
      });
    });
    it('should include {query} placeholder error even when query is not valid JSON', () => {
      const userQuery = `invalid`;
      expect(validateUserElasticSearchQuery(userQuery, sampleGeneratedElasticsearchQuery)).toEqual({
        isValid: false,
        isUserCustomized: true,
        userQueryErrors: ['User query must contain "{query}" placeholder'],
      });
    });
  });
});

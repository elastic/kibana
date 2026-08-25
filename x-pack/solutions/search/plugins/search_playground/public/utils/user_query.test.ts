/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateUserElasticsearchQuery, disableExecuteQuery } from './user_query';

describe('User Query utilities', () => {
  describe('validateUserElasticsearchQuery', () => {
    it('should return no error if userQuery is null', () => {
      expect(validateUserElasticsearchQuery(null)).toEqual(undefined);
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
      expect(validateUserElasticsearchQuery(userQuery)).toEqual({
        type: 'validate',
        message: expect.any(String),
      });
    });
    it('should return valid false if userQuery is empty', () => {
      expect(validateUserElasticsearchQuery('')).toEqual({
        type: 'required',
        message: expect.any(String),
        types: {
          value: expect.any(String),
          required: expect.any(String),
        },
      });
      expect(validateUserElasticsearchQuery('   ')).toEqual({
        type: 'required',
        message: expect.any(String),
        types: {
          value: expect.any(String),
          required: expect.any(String),
        },
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
      expect(validateUserElasticsearchQuery(userQuery)).toEqual({
        type: 'value',
        message: expect.any(String),
      });
    });
    it('should include {query} placeholder error even when query is not valid JSON', () => {
      const userQuery = `invalid`;
      expect(validateUserElasticsearchQuery(userQuery)).toEqual({
        type: 'value',
        message: expect.any(String),
      });
    });
  });
  describe('disableExecuteQuery', () => {
    it('should return true if query is null', () => {
      expect(disableExecuteQuery(false, null)).toEqual(true);
    });
    it('should return true if query is empty', () => {
      expect(disableExecuteQuery(false, '')).toEqual(true);
      expect(disableExecuteQuery(false, '   ')).toEqual(true);
    });
    it('should return true if query is undefined', () => {
      expect(disableExecuteQuery(false, undefined)).toEqual(true);
    });
    it('should return true if query is invalid', () => {
      expect(disableExecuteQuery(false, 'test')).toEqual(true);
    });
    it('should return false if query is valid', () => {
      expect(disableExecuteQuery(true, 'test')).toEqual(false);
    });
    it('should return false if query is valid and userCustomized is false', () => {
      expect(disableExecuteQuery(true, 'test')).toEqual(false);
    });
    it('should return false if query is valid and userCustomized is true', () => {
      expect(disableExecuteQuery(true, 'test')).toEqual(false);
    });
  });
});

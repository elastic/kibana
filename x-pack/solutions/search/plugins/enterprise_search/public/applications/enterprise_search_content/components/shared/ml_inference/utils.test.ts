/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMLType, getModelDisplayTitle, sortSourceFields, NLP_CONFIG_KEYS } from './utils';

describe('ml inference utils', () => {
  describe('sortSourceFields', () => {
    it('promotes fields', () => {
      let fields: string[] = ['id', 'body', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['body', 'id', 'url']);
      fields = ['id', 'body_content', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['body_content', 'id', 'url']);
      fields = ['id', 'title', 'message', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['title', 'id', 'message', 'url']);
      fields = ['id', 'body', 'title', 'message', 'url'];
      expect(fields.sort(sortSourceFields)).toEqual(['body', 'title', 'id', 'message', 'url']);
    });
  });
  describe('getMLType', () => {
    it('returns nlp type if present', () => {
      for (const nlpType of NLP_CONFIG_KEYS) {
        expect(getMLType(['pytorch', nlpType, 'foo', 'bar'])).toEqual(nlpType);
      }
    });
    it('returns first item if nlp config key not found in list', () => {
      expect(getMLType(['pytorch', 'foo'])).toEqual('pytorch');
    });
    it('returns empty string when no models given', () => {
      expect(getMLType([])).toEqual('');
    });
  });
  describe('model type titles', () => {
    test.each(NLP_CONFIG_KEYS)('%s should have a title defined', (type) =>
      expect(getModelDisplayTitle(type)).not.toBe('')
    );
    it('returns title for lang_ident', () => {
      expect(getModelDisplayTitle('lang_ident')).toBe('Language Identification');
    });
    it('unsupported model type should return empty title', () => {
      // This should technically never happen given the above test.
      expect(getModelDisplayTitle('foo')).toBe(undefined);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { getDocument, getFieldValue, getFieldsToBeFilteredOn } from './commons';

describe('getDocument', () => {
  it('returns _source when doc is an Elasticsearch hit', () => {
    const source = { entity: { id: 'e-1' } };
    expect(getDocument({ _source: source })).toBe(source);
  });

  it('returns doc as-is when _source is missing', () => {
    const doc = { user: { id: '123' } };
    expect(getDocument(doc)).toBe(doc);
  });

  it('returns doc as-is when _source is null', () => {
    const doc = { _source: null, user: { id: '123' } };
    expect(getDocument(doc)).toBe(doc);
  });
});

describe('getFieldValue', () => {
  describe('flattened documents', () => {
    it('returns value for flattened dot-notation key', () => {
      expect(getFieldValue({ 'user.id': '123' }, 'user.id')).toBe('123');
    });

    it('returns value for flattened entity.id', () => {
      expect(getFieldValue({ 'entity.id': 'e-1' }, 'entity.id')).toBe('e-1');
    });

    it('returns undefined when flattened key is missing', () => {
      expect(getFieldValue({ 'other.key': 'x' }, 'user.id')).toBeUndefined();
    });
  });

  describe('nested documents', () => {
    it('returns value for nested path', () => {
      expect(getFieldValue({ user: { id: '123' } }, 'user.id')).toBe('123');
    });

    it('returns undefined when path is missing', () => {
      expect(getFieldValue({ user: {} }, 'user.id')).toBeUndefined();
    });
  });
});

describe('getFieldsToBeFilteredOn', () => {
  const genericEuidFields = getEntityDefinitionWithoutId('generic').identityField.euidFields;

  describe('flattened documents', () => {
    it('returns values for flattened doc', () => {
      const result = getFieldsToBeFilteredOn({ 'entity.id': 'e-flat' }, genericEuidFields);
      expect(result.rankingPosition).toBe(0);
      expect(result.values).toEqual({ 'entity.id': 'e-flat' });
    });
  });

  describe('nested documents (existing behavior)', () => {
    it('returns values for nested doc', () => {
      const result = getFieldsToBeFilteredOn({ entity: { id: 'e-nested' } }, genericEuidFields);
      expect(result.rankingPosition).toBe(0);
      expect(result.values).toEqual({ 'entity.id': 'e-nested' });
    });
  });
});

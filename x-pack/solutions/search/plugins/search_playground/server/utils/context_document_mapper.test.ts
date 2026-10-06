/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextDocumentHitMapper } from './context_document_mapper';

describe('contextDocumentHitMapper', () => {
  it('should handle string contentField', () => {
    const hit = {
      _index: 'index',
      _score: 1,
      _id: 'id',
      _source: {
        text: 'this is some text in a field',
      },
    };
    const contentField = 'text';
    const document = contextDocumentHitMapper(contentField)(hit);
    expect(document).toEqual({
      pageContent: 'text: this is some text in a field',
      metadata: {
        _score: 1,
        _id: 'id',
        _index: 'index',
      },
    });
  });
  it('should handle object contentField', () => {
    const hit = {
      _index: 'test-index',
      _score: 1,
      _id: 'id',
      _source: {
        text: 'foo bar baz',
      },
    };
    const contentField = { 'test-index': 'text' };
    const document = contextDocumentHitMapper(contentField)(hit);
    expect(document).toEqual({
      pageContent: 'text: foo bar baz',
      metadata: {
        _score: 1,
        _id: 'id',
        _index: 'test-index',
      },
    });
  });
  it('should handle array contentField', () => {
    const hit = {
      _index: 'test-index',
      _score: 1,
      _id: 'id',
      _source: {
        text: 'foo bar baz',
        other: 'qux',
      },
    };
    const contentField = { 'test-index': ['text', 'other'] };
    const document = contextDocumentHitMapper(contentField)(hit);
    expect(document).toEqual({
      pageContent: 'text: foo bar baz\nother: qux',
      metadata: {
        _score: 1,
        _id: 'id',
        _index: 'test-index',
      },
    });
  });
  it('should not include empty field values', () => {
    const hit = {
      _index: 'test-index',
      _score: 1,
      _id: 'id',
      _source: {
        text: 'foo bar baz',
        other: '',
      },
    };
    const contentField = { 'test-index': ['text', 'other'] };
    const document = contextDocumentHitMapper(contentField)(hit);
    expect(document).toEqual({
      pageContent: 'text: foo bar baz',
      metadata: {
        _score: 1,
        _id: 'id',
        _index: 'test-index',
      },
    });
  });
  it('should handle all empty field values', () => {
    const hit = {
      _index: 'test-index',
      _score: 1,
      _id: 'id',
      _source: {
        text: '',
        other: '',
      },
    };
    const contentField = { 'test-index': ['text', 'other'] };
    const document = contextDocumentHitMapper(contentField)(hit);
    expect(document).toEqual({
      pageContent: '',
      metadata: {
        _score: 1,
        _id: 'id',
        _index: 'test-index',
      },
    });
  });
});

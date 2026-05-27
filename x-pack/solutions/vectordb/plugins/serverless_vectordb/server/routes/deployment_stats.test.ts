/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { containsVectorField } from './deployment_stats';

describe('containsVectorField', () => {
  it('returns false for undefined properties', () => {
    expect(containsVectorField(undefined)).toBe(false);
  });

  it('returns false for an empty properties map', () => {
    expect(containsVectorField({})).toBe(false);
  });

  it('returns true when a top-level field is dense_vector', () => {
    expect(containsVectorField({ embedding: { type: 'dense_vector' } })).toBe(true);
  });

  it('returns true when a top-level field is semantic_text', () => {
    expect(containsVectorField({ body: { type: 'semantic_text' } })).toBe(true);
  });

  it('returns false when no vector fields are present', () => {
    expect(
      containsVectorField({
        title: { type: 'text' },
        count: { type: 'integer' },
      })
    ).toBe(false);
  });

  it('returns true when a vector field is nested inside an object', () => {
    expect(
      containsVectorField({
        metadata: {
          properties: {
            embedding: { type: 'dense_vector' },
          },
        },
      })
    ).toBe(true);
  });

  it('returns true when a vector field is deeply nested', () => {
    expect(
      containsVectorField({
        level1: {
          properties: {
            level2: {
              properties: {
                vector: { type: 'dense_vector' },
              },
            },
          },
        },
      })
    ).toBe(true);
  });

  it('returns false when nested properties contain no vector fields', () => {
    expect(
      containsVectorField({
        metadata: {
          properties: {
            author: { type: 'keyword' },
          },
        },
      })
    ).toBe(false);
  });

  it('returns true on first match and short-circuits', () => {
    expect(
      containsVectorField({
        title: { type: 'text' },
        embedding: { type: 'dense_vector' },
        body: { type: 'text' },
      })
    ).toBe(true);
  });
});

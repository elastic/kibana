/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { graphRequestSchema } from './v1';

const baseQuery = {
  start: 'now-1d',
  end: 'now',
};

describe('graph request schema', () => {
  it('accepts up to 100 index patterns', () => {
    const indexPatterns = Array.from({ length: 100 }, (_, index) => `logs-${index}`);

    expect(() =>
      graphRequestSchema.validate({
        query: {
          ...baseQuery,
          indexPatterns,
        },
      })
    ).not.toThrow();
  });

  it('rejects more than 100 index patterns', () => {
    const indexPatterns = Array.from({ length: 101 }, (_, index) => `logs-${index}`);

    expect(() =>
      graphRequestSchema.validate({
        query: {
          ...baseQuery,
          indexPatterns,
        },
      })
    ).toThrow();
  });

  it('accepts up to 5000 origin event IDs', () => {
    const originEventIds = Array.from({ length: 5000 }, (_, index) => ({
      id: `event-${index}`,
      isAlert: false,
    }));

    expect(() =>
      graphRequestSchema.validate({
        query: {
          ...baseQuery,
          originEventIds,
        },
      })
    ).not.toThrow();
  });

  it('rejects more than 5000 origin event IDs', () => {
    const originEventIds = Array.from({ length: 5001 }, (_, index) => ({
      id: `event-${index}`,
      isAlert: false,
    }));

    expect(() =>
      graphRequestSchema.validate({
        query: {
          ...baseQuery,
          originEventIds,
        },
      })
    ).toThrow();
  });

  it('accepts up to 5000 entity IDs', () => {
    const entityIds = Array.from({ length: 5000 }, (_, index) => ({
      id: `entity-${index}`,
      isOrigin: false,
    }));

    expect(() =>
      graphRequestSchema.validate({
        query: {
          ...baseQuery,
          entityIds,
        },
      })
    ).not.toThrow();
  });

  it('rejects more than 5000 entity IDs', () => {
    const entityIds = Array.from({ length: 5001 }, (_, index) => ({
      id: `entity-${index}`,
      isOrigin: false,
    }));

    expect(() =>
      graphRequestSchema.validate({
        query: {
          ...baseQuery,
          entityIds,
        },
      })
    ).toThrow();
  });
});

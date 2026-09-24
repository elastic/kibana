/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveDetailSchema } from './resolve_detail_schema';

const detected = {
  schemas: ['ecs' as const, 'semconv' as const],
  preferredSchema: 'semconv' as const,
};

describe('resolveDetailSchema', () => {
  it('omits schema for pods while the schema selector flag is off', () => {
    expect(
      resolveDetailSchema({
        urlSchema: 'semconv',
        timeRangeMetadata: detected,
        nodeType: 'pod',
        isPodSchemaSelectorEnabled: false,
      })
    ).toBeUndefined();
  });

  it('waits while time-range metadata is missing', () => {
    expect(
      resolveDetailSchema({
        urlSchema: 'semconv',
        timeRangeMetadata: undefined,
        nodeType: 'pod',
        isPodSchemaSelectorEnabled: true,
      })
    ).toBeUndefined();
  });

  it('trusts the URL schema only when more than one schema is present', () => {
    expect(
      resolveDetailSchema({
        urlSchema: 'ecs',
        timeRangeMetadata: detected,
        nodeType: 'pod',
        isPodSchemaSelectorEnabled: true,
      })
    ).toBe('ecs');
  });

  it('uses the detected schema when the time range has a single schema', () => {
    expect(
      resolveDetailSchema({
        urlSchema: 'semconv',
        timeRangeMetadata: { schemas: ['ecs'], preferredSchema: 'ecs' },
        nodeType: 'pod',
        isPodSchemaSelectorEnabled: true,
      })
    ).toBe('ecs');
  });

  it('omits schema when detection has no preferred schema', () => {
    expect(
      resolveDetailSchema({
        urlSchema: null,
        timeRangeMetadata: { schemas: ['ecs'], preferredSchema: null },
        nodeType: 'pod',
        isPodSchemaSelectorEnabled: true,
      })
    ).toBeUndefined();
  });
});

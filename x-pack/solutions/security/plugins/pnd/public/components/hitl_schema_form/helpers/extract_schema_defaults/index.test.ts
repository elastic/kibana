/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractSchemaDefaults } from '.';
import { PND_GATE_SCHEMA } from '../../test_helpers/pnd_gate_schema';

describe('extractSchemaDefaults', () => {
  it('returns nothing for a schema with no properties', () => {
    expect(extractSchemaDefaults({ properties: {}, type: 'object' })).toEqual({});
  });

  it('returns nothing for the PND gate schema, which declares no defaults', () => {
    expect(extractSchemaDefaults(PND_GATE_SCHEMA)).toEqual({});
  });

  it('extracts the default of every property that declares one', () => {
    expect(
      extractSchemaDefaults({
        properties: {
          decision: { default: 'approve', enum: ['approve', 'dismiss'], type: 'string' },
          rationale: { type: 'string' },
        },
        type: 'object',
      })
    ).toEqual({ decision: 'approve' });
  });

  it('keeps falsy defaults, which are declared values rather than absent ones', () => {
    expect(
      extractSchemaDefaults({
        properties: {
          count: { default: 0, type: 'number' },
          note: { default: '', type: 'string' },
          silent: { default: false, type: 'boolean' },
        },
        type: 'object',
      })
    ).toEqual({ count: 0, note: '', silent: false });
  });

  it('skips a property whose default is explicitly undefined', () => {
    expect(
      extractSchemaDefaults({
        properties: { rationale: { default: undefined, type: 'string' } },
        type: 'object',
      })
    ).toEqual({});
  });

  it('extracts an array default', () => {
    expect(
      extractSchemaDefaults({
        properties: {
          tags: { default: ['contain'], items: { enum: ['contain', 'escalate'] }, type: 'array' },
        },
        type: 'object',
      })
    ).toEqual({ tags: ['contain'] });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canRenderWithSchemaForm } from '.';
import { PND_GATE_SCHEMA } from '../../test_helpers/pnd_gate_schema';

describe('canRenderWithSchemaForm', () => {
  it('accepts the schema every PND gate ships', () => {
    expect(canRenderWithSchemaForm(PND_GATE_SCHEMA)).toBe(true);
  });

  describe('non-schemas', () => {
    it('rejects undefined', () => {
      expect(canRenderWithSchemaForm(undefined)).toBe(false);
    });

    it('rejects null', () => {
      expect(canRenderWithSchemaForm(null)).toBe(false);
    });

    it('rejects a string', () => {
      expect(canRenderWithSchemaForm('type: object')).toBe(false);
    });

    it('rejects an array', () => {
      expect(canRenderWithSchemaForm([])).toBe(false);
    });
  });

  describe('empty schemas', () => {
    // Every PND proposal row that has no gate schema carries `{}`, and the
    // caller must fall back to its fixed controls rather than render nothing.
    it('rejects the empty object PND rows carry when a gate declares no schema', () => {
      expect(canRenderWithSchemaForm({})).toBe(false);
    });

    it('rejects a schema whose properties are empty', () => {
      expect(canRenderWithSchemaForm({ properties: {}, type: 'object' })).toBe(false);
    });

    it('rejects a schema whose properties are not an object', () => {
      expect(canRenderWithSchemaForm({ properties: [], type: 'object' })).toBe(false);
    });
  });

  describe('unsupported JSON Schema keywords', () => {
    it.each(['allOf', 'anyOf', 'oneOf', '$ref', 'definitions'])(
      'rejects a schema declaring %s at the root',
      (keyword) => {
        expect(canRenderWithSchemaForm({ ...PND_GATE_SCHEMA, [keyword]: {} })).toBe(false);
      }
    );

    it.each(['allOf', 'anyOf', 'oneOf', '$ref', 'definitions'])(
      'rejects a property declaring %s',
      (keyword) => {
        expect(
          canRenderWithSchemaForm({
            properties: { choice: { [keyword]: {}, type: 'string' } },
            type: 'object',
          })
        ).toBe(false);
      }
    );
  });

  describe('the root type', () => {
    it('accepts a schema that omits the root type', () => {
      expect(canRenderWithSchemaForm({ properties: { rationale: { type: 'string' } } })).toBe(true);
    });

    it('rejects a root type that is not object', () => {
      expect(
        canRenderWithSchemaForm({ properties: { rationale: { type: 'string' } }, type: 'array' })
      ).toBe(false);
    });
  });

  describe('property types', () => {
    it.each(['array', 'boolean', 'number', 'string'])('accepts a %s property', (type) => {
      const field = type === 'array' ? { items: { enum: ['a'] }, type } : { type };

      expect(canRenderWithSchemaForm({ properties: { field }, type: 'object' })).toBe(true);
    });

    it('rejects a property that declares no type', () => {
      expect(canRenderWithSchemaForm({ properties: { rationale: { title: 'Rationale' } } })).toBe(
        false
      );
    });

    it.each(['integer', 'null', 'unknown'])('rejects the unsupported type %s', (type) => {
      expect(canRenderWithSchemaForm({ properties: { field: { type } } })).toBe(false);
    });

    it('rejects a nested object property', () => {
      expect(
        canRenderWithSchemaForm({
          properties: { nested: { properties: { inner: { type: 'string' } }, type: 'object' } },
        })
      ).toBe(false);
    });

    it('rejects a property that is not an object', () => {
      expect(canRenderWithSchemaForm({ properties: { rationale: 'string' } })).toBe(false);
    });

    it('rejects a null property', () => {
      expect(canRenderWithSchemaForm({ properties: { rationale: null } })).toBe(false);
    });
  });

  describe('array properties', () => {
    it('rejects an array property with no items', () => {
      expect(canRenderWithSchemaForm({ properties: { tags: { type: 'array' } } })).toBe(false);
    });

    it('rejects an array property whose items declare no enum', () => {
      expect(
        canRenderWithSchemaForm({
          properties: { tags: { items: { type: 'string' }, type: 'array' } },
        })
      ).toBe(false);
    });

    it('rejects an array property whose items enum is empty', () => {
      expect(
        canRenderWithSchemaForm({ properties: { tags: { items: { enum: [] }, type: 'array' } } })
      ).toBe(false);
    });

    it('accepts an array property whose items enum is populated', () => {
      expect(
        canRenderWithSchemaForm({
          properties: { tags: { items: { enum: ['contain', 'escalate'] }, type: 'array' } },
        })
      ).toBe(true);
    });
  });

  describe('enums', () => {
    it('accepts a numeric enum', () => {
      expect(
        canRenderWithSchemaForm({ properties: { level: { enum: [1, 2], type: 'number' } } })
      ).toBe(true);
    });

    it('rejects an enum that is not an array', () => {
      expect(
        canRenderWithSchemaForm({ properties: { decision: { enum: 'approve', type: 'string' } } })
      ).toBe(false);
    });

    it('rejects an enum holding a value that is neither a string nor a number', () => {
      expect(
        canRenderWithSchemaForm({ properties: { decision: { enum: [{}], type: 'string' } } })
      ).toBe(false);
    });

    // An empty enum is not a rejection: the control dispatch falls through to
    // the property's own type, which still renders.
    it('accepts an empty enum', () => {
      expect(
        canRenderWithSchemaForm({ properties: { decision: { enum: [], type: 'string' } } })
      ).toBe(true);
    });
  });

  describe('required', () => {
    it('accepts a schema with no required list', () => {
      expect(canRenderWithSchemaForm({ properties: { rationale: { type: 'string' } } })).toBe(true);
    });

    it('rejects a required list that is not an array', () => {
      expect(
        canRenderWithSchemaForm({
          properties: { rationale: { type: 'string' } },
          required: 'rationale',
        })
      ).toBe(false);
    });

    it('rejects a required list holding a non-string', () => {
      expect(
        canRenderWithSchemaForm({ properties: { rationale: { type: 'string' } }, required: [7] })
      ).toBe(false);
    });
  });

  it('narrows the schema for the caller', () => {
    // Exactly what a proposal row carries: `inputSchema` is typed
    // `Record<string, unknown>` on the wire, and the guard is what makes it
    // renderable.
    const inputSchema: Record<string, unknown> = { ...PND_GATE_SCHEMA };

    if (canRenderWithSchemaForm(inputSchema)) {
      // A compile-time assertion as much as a runtime one: the guard is what
      // turns a row's `Record<string, unknown>` into something renderable.
      expect(Object.keys(inputSchema.properties)).toEqual(['decision', 'rationale']);
    } else {
      throw new Error('expected the PND gate schema to be renderable');
    }
  });
});

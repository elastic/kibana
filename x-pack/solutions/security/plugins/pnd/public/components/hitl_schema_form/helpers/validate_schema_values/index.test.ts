/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSchemaValues } from '.';
import * as i18n from '../../translations';
import { PND_GATE_SCHEMA } from '../../test_helpers/pnd_gate_schema';

describe('validateSchemaValues', () => {
  it('reports nothing when the schema requires nothing', () => {
    expect(
      validateSchemaValues({ properties: { rationale: { type: 'string' } }, type: 'object' }, {})
    ).toEqual({});
  });

  it('reports every unanswered required field of a real PND gate', () => {
    expect(validateSchemaValues(PND_GATE_SCHEMA, {})).toEqual({
      decision: i18n.REQUIRED_FIELD_ERROR,
      rationale: i18n.REQUIRED_FIELD_ERROR,
    });
  });

  it('reports nothing once a real PND gate is fully answered', () => {
    expect(
      validateSchemaValues(PND_GATE_SCHEMA, {
        decision: 'approve',
        rationale: 'Confirmed malicious',
      })
    ).toEqual({});
  });

  describe('what counts as missing', () => {
    const schema = {
      properties: {
        rationale: { type: 'string' as const },
        tags: { items: { enum: ['contain'] }, type: 'array' as const },
      },
      required: ['rationale'],
      type: 'object' as const,
    };

    it('reports an undefined value', () => {
      expect(validateSchemaValues(schema, {})).toEqual({ rationale: i18n.REQUIRED_FIELD_ERROR });
    });

    it('reports a null value', () => {
      expect(validateSchemaValues(schema, { rationale: null })).toEqual({
        rationale: i18n.REQUIRED_FIELD_ERROR,
      });
    });

    it('reports an empty string', () => {
      expect(validateSchemaValues(schema, { rationale: '' })).toEqual({
        rationale: i18n.REQUIRED_FIELD_ERROR,
      });
    });

    it('reports an empty array', () => {
      expect(validateSchemaValues({ ...schema, required: ['tags'] }, { tags: [] })).toEqual({
        tags: i18n.REQUIRED_FIELD_ERROR,
      });
    });

    it('accepts a populated array', () => {
      expect(
        validateSchemaValues({ ...schema, required: ['tags'] }, { tags: ['contain'] })
      ).toEqual({});
    });

    it('accepts a whitespace-only string, which the route rejects rather than the form', () => {
      expect(validateSchemaValues(schema, { rationale: '   ' })).toEqual({});
    });
  });

  describe('the boolean carve-out', () => {
    const schema = {
      properties: { acknowledged: { type: 'boolean' as const } },
      required: ['acknowledged'],
      type: 'object' as const,
    };

    // An unchecked switch is a legitimate `false`, not an unanswered question.
    it('never reports a required boolean left false', () => {
      expect(validateSchemaValues(schema, { acknowledged: false })).toEqual({});
    });

    it('never reports a required boolean left untouched', () => {
      expect(validateSchemaValues(schema, {})).toEqual({});
    });

    it('never reports a required boolean set true', () => {
      expect(validateSchemaValues(schema, { acknowledged: true })).toEqual({});
    });
  });

  describe('other falsy values', () => {
    it('accepts zero for a required number', () => {
      expect(
        validateSchemaValues(
          { properties: { count: { type: 'number' } }, required: ['count'], type: 'object' },
          { count: 0 }
        )
      ).toEqual({});
    });
  });

  it('reports a required name the schema declares no property for', () => {
    expect(
      validateSchemaValues(
        { properties: { rationale: { type: 'string' } }, required: ['missing'], type: 'object' },
        {}
      )
    ).toEqual({ missing: i18n.REQUIRED_FIELD_ERROR });
  });
});

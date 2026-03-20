/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldEvaluation } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { applyFieldEvaluations, getFieldValue, getSourceMatchSpec } from './field_evaluations';

describe('getFieldValue', () => {
  it('returns string value when doc has flat field', () => {
    expect(getFieldValue({ foo: 'bar' }, 'foo')).toBe('bar');
    expect(getFieldValue({ a: 'x' }, 'a')).toBe('x');
  });

  it('returns value from nested path via get(doc, field) when flat key is missing', () => {
    expect(getFieldValue({ event: { module: 'okta' } }, 'event.module')).toBe('okta');
    expect(getFieldValue({ a: { b: { c: 'nested' } } }, 'a.b.c')).toBe('nested');
  });

  it('prefers flat key over nested path when both exist', () => {
    const doc = { 'event.module': 'flat', event: { module: 'nested' } };
    expect(getFieldValue(doc, 'event.module')).toBe('flat');
  });

  it('returns undefined when field is missing, null, or empty string', () => {
    expect(getFieldValue({}, 'missing')).toBeUndefined();
    expect(getFieldValue({ foo: null }, 'foo')).toBeUndefined();
    expect(getFieldValue({ foo: undefined }, 'foo')).toBeUndefined();
    expect(getFieldValue({ foo: '' }, 'foo')).toBeUndefined();
    expect(getFieldValue({ event: { module: null } }, 'event.module')).toBeUndefined();
    expect(getFieldValue({ event: { module: '' } }, 'event.module')).toBeUndefined();
  });

  it('returns first element as string when value is array', () => {
    expect(getFieldValue({ foo: ['a', 'b'] }, 'foo')).toBe('a');
    expect(getFieldValue({ event: { module: ['okta'] } }, 'event.module')).toBe('okta');
  });

  it('returns undefined for empty array or array with null/undefined first element', () => {
    expect(getFieldValue({ foo: [] }, 'foo')).toBeUndefined();
    expect(getFieldValue({ foo: [null] }, 'foo')).toBeUndefined();
    expect(getFieldValue({ foo: [undefined] }, 'foo')).toBeUndefined();
  });

  it('returns undefined when value is an object', () => {
    expect(getFieldValue({ foo: {} }, 'foo')).toBeUndefined();
    expect(getFieldValue({ foo: { bar: 1 } }, 'foo')).toBeUndefined();
  });

  it('converts number and boolean to string', () => {
    expect(getFieldValue({ foo: 42 }, 'foo')).toBe('42');
    expect(getFieldValue({ foo: 0 }, 'foo')).toBe('0');
    expect(getFieldValue({ foo: true }, 'foo')).toBe('true');
    expect(getFieldValue({ foo: false }, 'foo')).toBe('false');
  });
});

describe('applyFieldEvaluations', () => {
  // User entity uses calculated identity with fieldEvaluations (entity.namespace from event.module)
  const userEvaluations = (
    getEntityDefinitionWithoutId('user').identityField as { fieldEvaluations?: FieldEvaluation[] }
  ).fieldEvaluations!;

  it('sets entity.namespace to fallbackValue when both event.module and data_stream.dataset are missing', () => {
    expect(applyFieldEvaluations({}, userEvaluations)).toEqual({
      'entity.namespace': 'unknown',
    });
    expect(applyFieldEvaluations({ event: {} }, userEvaluations)).toEqual({
      'entity.namespace': 'unknown',
    });
    expect(applyFieldEvaluations({ event: { module: null } }, userEvaluations)).toEqual({
      'entity.namespace': 'unknown',
    });
    expect(applyFieldEvaluations({ event: { module: '' } }, userEvaluations)).toEqual({
      'entity.namespace': 'unknown',
    });
  });

  it('maps okta and entityanalytics_okta to okta', () => {
    expect(applyFieldEvaluations({ event: { module: 'okta' } }, userEvaluations)).toEqual({
      'entity.namespace': 'okta',
    });
    expect(
      applyFieldEvaluations({ event: { module: 'entityanalytics_okta' } }, userEvaluations)
    ).toEqual({
      'entity.namespace': 'okta',
    });
  });

  it('maps azure and entityanalytics_entra_id to entra_id', () => {
    expect(applyFieldEvaluations({ event: { module: 'azure' } }, userEvaluations)).toEqual({
      'entity.namespace': 'entra_id',
    });
    expect(
      applyFieldEvaluations({ event: { module: 'entityanalytics_entra_id' } }, userEvaluations)
    ).toEqual({ 'entity.namespace': 'entra_id' });
  });

  it('maps o365 and o365_metrics to microsoft_365', () => {
    expect(applyFieldEvaluations({ event: { module: 'o365' } }, userEvaluations)).toEqual({
      'entity.namespace': 'microsoft_365',
    });
    expect(applyFieldEvaluations({ event: { module: 'o365_metrics' } }, userEvaluations)).toEqual({
      'entity.namespace': 'microsoft_365',
    });
  });

  it('uses event.module as-is when no whenClause matches (fallback to source)', () => {
    expect(applyFieldEvaluations({ event: { module: 'custom_module' } }, userEvaluations)).toEqual({
      'entity.namespace': 'custom_module',
    });
  });

  it('when event.module is a list, uses first element for matching and fallback', () => {
    expect(applyFieldEvaluations({ event: { module: ['okta'] } }, userEvaluations)).toEqual({
      'entity.namespace': 'okta',
    });
    expect(
      applyFieldEvaluations({ event: { module: ['other', 'okta'] } }, userEvaluations)
    ).toEqual({ 'entity.namespace': 'other' });
    expect(
      applyFieldEvaluations(
        { event: { module: ['entityanalytics_entra_id', 'azure'] } },
        userEvaluations
      )
    ).toEqual({ 'entity.namespace': 'entra_id' });
  });

  it('when event.module is a list and no clause matches, uses first element as fallback', () => {
    expect(
      applyFieldEvaluations({ event: { module: ['custom_a', 'custom_b'] } }, userEvaluations)
    ).toEqual({ 'entity.namespace': 'custom_a' });
  });

  it('returns empty object when fieldEvaluations is empty', () => {
    expect(applyFieldEvaluations({ event: { module: 'okta' } }, [])).toEqual({});
  });

  it('uses first chunk of data_stream.dataset when event.module is missing', () => {
    expect(
      applyFieldEvaluations({ data_stream: { dataset: 'okta.logs' } }, userEvaluations)
    ).toEqual({ 'entity.namespace': 'okta' });
    expect(
      applyFieldEvaluations(
        { data_stream: { dataset: 'entityanalytics_entra_id.metrics' } },
        userEvaluations
      )
    ).toEqual({ 'entity.namespace': 'entra_id' });
  });

  it('returns full data_stream.dataset when it has no delimiter', () => {
    expect(applyFieldEvaluations({ data_stream: { dataset: 'okta' } }, userEvaluations)).toEqual({
      'entity.namespace': 'okta',
    });
    expect(
      applyFieldEvaluations(
        { data_stream: { dataset: 'entityanalytics_entra_id' } },
        userEvaluations
      )
    ).toEqual({ 'entity.namespace': 'entra_id' });
  });

  it('sets entity.namespace to unknown when data_stream.dataset starts with delimiter (empty first chunk)', () => {
    expect(applyFieldEvaluations({ data_stream: { dataset: '.logs' } }, userEvaluations)).toEqual({
      'entity.namespace': 'unknown',
    });
  });

  it('prefers event.module over data_stream.dataset when both are present', () => {
    expect(
      applyFieldEvaluations(
        { event: { module: 'azure' }, data_stream: { dataset: 'okta.logs' } },
        userEvaluations
      )
    ).toEqual({ 'entity.namespace': 'entra_id' });
  });

  it('sets entity.namespace to unknown when only data_stream.dataset is present but empty', () => {
    expect(applyFieldEvaluations({ data_stream: { dataset: '' } }, userEvaluations)).toEqual({
      'entity.namespace': 'unknown',
    });
  });
});

describe('getSourceMatchSpec', () => {
  const userEvaluations = (
    getEntityDefinitionWithoutId('user').identityField as { fieldEvaluations?: FieldEvaluation[] }
  ).fieldEvaluations!;
  const userEval = userEvaluations[0];

  it('returns unknown when both event.module and data_stream.dataset are missing', () => {
    expect(getSourceMatchSpec({}, userEval)).toEqual({ type: 'unknown' });
    expect(getSourceMatchSpec({ event: {} }, userEval)).toEqual({ type: 'unknown' });
    expect(getSourceMatchSpec({ event: { module: null } }, userEval)).toEqual({ type: 'unknown' });
    expect(getSourceMatchSpec({ event: { module: '' } }, userEval)).toEqual({ type: 'unknown' });
  });

  it('returns single value when only event.module is present (no whenClause match)', () => {
    expect(getSourceMatchSpec({ event: { module: 'aws' } }, userEval)).toEqual({
      type: 'values',
      values: ['aws'],
    });
  });

  it('returns single value when only first chunk of data_stream.dataset is present', () => {
    expect(getSourceMatchSpec({ data_stream: { dataset: 'aws.cloudtrail' } }, userEval)).toEqual({
      type: 'values',
      values: ['aws'],
    });
  });

  it('returns full value when data_stream.dataset has no delimiter', () => {
    // okta matches whenClause so spec expands to sourceMatchesAny
    expect(getSourceMatchSpec({ data_stream: { dataset: 'okta' } }, userEval)).toEqual({
      type: 'values',
      values: ['okta', 'entityanalytics_okta'],
    });
    // aws has no whenClause match so single value
    expect(getSourceMatchSpec({ data_stream: { dataset: 'aws' } }, userEval)).toEqual({
      type: 'values',
      values: ['aws'],
    });
  });

  it('returns unknown when data_stream.dataset starts with delimiter (empty first chunk)', () => {
    expect(getSourceMatchSpec({ data_stream: { dataset: '.logs' } }, userEval)).toEqual({
      type: 'unknown',
    });
  });

  it('expands to sourceMatchesAny when whenClause matches (event.module)', () => {
    expect(getSourceMatchSpec({ event: { module: 'okta' } }, userEval)).toEqual({
      type: 'values',
      values: ['okta', 'entityanalytics_okta'],
    });
    expect(getSourceMatchSpec({ event: { module: 'entityanalytics_okta' } }, userEval)).toEqual({
      type: 'values',
      values: ['okta', 'entityanalytics_okta'],
    });
  });

  it('expands to sourceMatchesAny when whenClause matches (data_stream.dataset first chunk)', () => {
    expect(getSourceMatchSpec({ data_stream: { dataset: 'okta.logs' } }, userEval)).toEqual({
      type: 'values',
      values: ['okta', 'entityanalytics_okta'],
    });
  });

  it('prefers event.module over data_stream.dataset (first source wins)', () => {
    expect(
      getSourceMatchSpec(
        { event: { module: 'azure' }, data_stream: { dataset: 'okta.logs' } },
        userEval
      )
    ).toEqual({ type: 'values', values: ['azure', 'entityanalytics_entra_id'] });
  });
});

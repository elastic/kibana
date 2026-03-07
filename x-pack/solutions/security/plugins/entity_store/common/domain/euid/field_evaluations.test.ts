/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { applyFieldEvaluations } from './field_evaluations';

describe('applyFieldEvaluations', () => {
  const userEvaluations = getEntityDefinitionWithoutId('user').identityField.fieldEvaluations!;

  it('returns entity.namespace null when event.module is null or missing', () => {
    expect(applyFieldEvaluations({}, userEvaluations)).toEqual({ 'entity.namespace': null });
    expect(applyFieldEvaluations({ event: {} }, userEvaluations)).toEqual({
      'entity.namespace': null,
    });
    expect(applyFieldEvaluations({ event: { module: null } }, userEvaluations)).toEqual({
      'entity.namespace': null,
    });
    expect(applyFieldEvaluations({ event: { module: '' } }, userEvaluations)).toEqual({
      'entity.namespace': null,
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

  it('returns empty object when fieldEvaluations is empty', () => {
    expect(applyFieldEvaluations({ event: { module: 'okta' } }, [])).toEqual({});
  });
});

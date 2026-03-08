/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldEvaluation } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { applyFieldEvaluations } from './field_evaluations';

describe('applyFieldEvaluations', () => {
  // User entity uses calculated identity with fieldEvaluations (entity.namespace from event.module)
  const userEvaluations = (
    getEntityDefinitionWithoutId('user').identityField as { fieldEvaluations?: FieldEvaluation[] }
  ).fieldEvaluations!;

  it('omits entity.namespace when event.module is null or missing (no clause matches)', () => {
    expect(applyFieldEvaluations({}, userEvaluations)).toEqual({});
    expect(applyFieldEvaluations({ event: {} }, userEvaluations)).toEqual({});
    expect(applyFieldEvaluations({ event: { module: null } }, userEvaluations)).toEqual({});
    expect(applyFieldEvaluations({ event: { module: '' } }, userEvaluations)).toEqual({});
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
});

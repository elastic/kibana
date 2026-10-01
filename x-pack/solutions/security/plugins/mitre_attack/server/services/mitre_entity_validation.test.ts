/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  getMockMitreTactic,
  getMockMitreTechnique,
  getMockMitreSubtechnique,
} from '../mocks/mitre_entities.mock';
import { validateMitreEntity, validateMitreEntities } from './mitre_entity_validation';

describe('validateMitreEntity', () => {
  it('accepts a valid tactic and returns it', () => {
    const tactic = getMockMitreTactic();
    expect(validateMitreEntity(tactic)).toEqual(tactic);
  });

  it('accepts a valid technique and returns it', () => {
    const technique = getMockMitreTechnique();
    expect(validateMitreEntity(technique)).toEqual(technique);
  });

  it('accepts a valid subtechnique and returns it', () => {
    const subtechnique = getMockMitreSubtechnique();
    expect(validateMitreEntity(subtechnique)).toEqual(subtechnique);
  });

  it('throws BadRequestError for an invalid object', () => {
    expect(() => validateMitreEntity({ foo: 'bar' })).toThrow(BadRequestError);
  });

  it('includes the id and name in the error message when readable', () => {
    const badEntity = { id: 'T9999', name: 'Bad Entity', type: 'unknown-type' };
    let thrownError: Error | undefined;
    try {
      validateMitreEntity(badEntity);
    } catch (err) {
      thrownError = err as Error;
    }
    expect(thrownError).toBeInstanceOf(BadRequestError);
    expect(thrownError?.message).toContain('"T9999"');
    expect(thrownError?.message).toContain('"Bad Entity"');
  });

  it('falls back to (unknown id) and (unknown name) when fields are missing', () => {
    let thrownError: Error | undefined;
    try {
      validateMitreEntity({ framework: 'enterprise' });
    } catch (err) {
      thrownError = err as Error;
    }
    expect(thrownError).toBeInstanceOf(BadRequestError);
    expect(thrownError?.message).toContain('(unknown id)');
    expect(thrownError?.message).toContain('(unknown name)');
  });

  it('includes the full entity JSON in the error message', () => {
    const badEntity = { id: 'BAD', name: 'Test' };
    let thrownError: Error | undefined;
    try {
      validateMitreEntity(badEntity);
    } catch (err) {
      thrownError = err as Error;
    }
    expect(thrownError?.message).toContain(JSON.stringify(badEntity, null, 2));
  });
});

describe('validateMitreEntities', () => {
  it('validates all entities and returns them', () => {
    const entities = [getMockMitreTactic(), getMockMitreTechnique(), getMockMitreSubtechnique()];
    expect(validateMitreEntities(entities)).toEqual(entities);
  });

  it('throws BadRequestError when any entity is invalid', () => {
    const entities = [getMockMitreTactic(), { bad: 'entity' }];
    expect(() => validateMitreEntities(entities)).toThrow(BadRequestError);
  });
});

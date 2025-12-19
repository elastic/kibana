/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  isElserOnMlNodeSemanticField,
  hasElserOnMlNodeSemanticTextField,
  flattenMappings,
  prepareFieldsForEisUpdate,
  deNormalize,
} from './utils';

import {
  deNormalizedField,
  flattenedFields,
  flattenedTextFields,
  mappings,
  normalizedFields,
  selectedOption,
  selectedOptionWithChildren,
  textFieldMappings,
} from './fixtures';
import { ELSER_ON_EIS_INFERENCE_ENDPOINT_ID } from '../../constants';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

let mockUuid = 0;

describe('hasElserOnMlNodeSemanticTextField', () => {
  it('returns true if at least one field matches', () => {
    expect(hasElserOnMlNodeSemanticTextField(flattenedFields)).toBe(true);
  });

  it('returns false if no fields match', () => {
    expect(hasElserOnMlNodeSemanticTextField(flattenedTextFields)).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(hasElserOnMlNodeSemanticTextField({})).toBe(false);
  });
});

describe('isElserOnMlNodeSemanticField', () => {
  it('returns true when inference_id matches ELSER ML node endpoint', () => {
    expect(isElserOnMlNodeSemanticField(flattenedFields['3'])).toBe(true);
  });

  it('returns false when inference_id does not match', () => {
    expect(isElserOnMlNodeSemanticField(flattenedFields['1'])).toBe(false);
  });

  it('returns false when inference_id is missing', () => {
    expect(isElserOnMlNodeSemanticField(flattenedTextFields['1'])).toBe(false);
  });
});

describe('flattenMappings', () => {
  beforeAll(() => {
    (uuidv4 as jest.Mock).mockImplementation(() => (++mockUuid).toString());
  });

  afterEach(() => {
    mockUuid = 0;
  });

  it('flattens a simple object with a semantic_text child', () => {
    const result = flattenMappings(mappings);

    expect(result).toEqual(flattenedFields);
  });

  it('ignores fields without type semantic_text or properties', () => {
    const result = flattenMappings(textFieldMappings);

    expect(result).toEqual({});
  });
});

describe('prepareFieldsForEisUpdate', () => {
  it('updates inference_id and includes parent fields', () => {
    const result = prepareFieldsForEisUpdate(selectedOption, flattenedFields);
    // The selected option is in the result
    expect(Object.keys(result.byId)).toContain('5');
    // The selected option has the EIS endpoint set as the inference_id
    expect(result.byId['5'].source.inference_id).toBe(ELSER_ON_EIS_INFERENCE_ENDPOINT_ID);
    // The selected option has a parent id set
    expect(result.byId['5'].parentId).toEqual('4');
    // The selected option's parent is in the result
    expect(result.byId['4']).toBeDefined();
    // The rootLevelField array contains the grandparent of the selected option
    expect(result.rootLevelFields).toEqual(['2']);
  });

  it('prunes unselected childFields', () => {
    const result = prepareFieldsForEisUpdate(selectedOptionWithChildren, flattenedFields);
    // The result contains the selected child option
    expect(result.byId['3']).toBeDefined();
    // The result does not contain the unselected sibling option
    expect(result.byId['4']).toBeUndefined();
  });
});

describe('deNormalize', () => {
  it('reconstructs nested fields from normalized structure', () => {
    const result = deNormalize(normalizedFields);

    expect(result).toEqual(deNormalizedField);
  });
});

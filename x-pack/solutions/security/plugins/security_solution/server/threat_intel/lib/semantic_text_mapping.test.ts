/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSemanticTextInferenceId } from './semantic_text_mapping';

const INDEX = '.kibana-threat-reports';

const mappingsOf = (properties: Record<string, unknown>) =>
  ({ [INDEX]: { mappings: { properties } } } as never);

describe('getSemanticTextInferenceId', () => {
  it('resolves a nested semantic_text field to its inference_id', () => {
    const mappings = mappingsOf({
      content: { properties: { title: { type: 'semantic_text', inference_id: '.elser' } } },
    });
    expect(getSemanticTextInferenceId(mappings, INDEX, 'content.title')).toBe('.elser');
  });

  it('returns undefined when the field is not semantic_text', () => {
    const mappings = mappingsOf({
      content: { properties: { title: { type: 'text', inference_id: '.elser' } } },
    });
    expect(getSemanticTextInferenceId(mappings, INDEX, 'content.title')).toBeUndefined();
  });

  it('returns undefined when inference_id is absent', () => {
    const mappings = mappingsOf({ content: { properties: { title: { type: 'semantic_text' } } } });
    expect(getSemanticTextInferenceId(mappings, INDEX, 'content.title')).toBeUndefined();
  });

  it('returns undefined for a missing path segment or index', () => {
    const mappings = mappingsOf({ content: { properties: {} } });
    expect(getSemanticTextInferenceId(mappings, INDEX, 'content.title')).toBeUndefined();
    expect(getSemanticTextInferenceId(mappings, INDEX, 'other.title')).toBeUndefined();
    expect(getSemanticTextInferenceId({} as never, INDEX, 'content.title')).toBeUndefined();
  });
});

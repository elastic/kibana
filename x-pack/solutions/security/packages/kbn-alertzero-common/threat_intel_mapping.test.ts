/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getReportEmbeddingEndpointIds,
  getSemanticTextInferenceId,
  isReportsIndexManaged,
} from './threat_intel_mapping';

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

describe('isReportsIndexManaged', () => {
  it('is true when every matched index is dynamic: strict', () => {
    const mappings = {
      [INDEX]: { mappings: { dynamic: 'strict' } },
      [`${INDEX}-000002`]: { mappings: { dynamic: 'strict' } },
    } as never;
    expect(isReportsIndexManaged(mappings)).toBe(true);
  });

  it('is false when any matched index is not dynamic: strict', () => {
    const mappings = {
      [INDEX]: { mappings: { dynamic: 'strict' } },
      [`${INDEX}-000002`]: { mappings: { dynamic: 'true' } },
    } as never;
    expect(isReportsIndexManaged(mappings)).toBe(false);
  });

  it('is false when the mapping omits dynamic', () => {
    expect(isReportsIndexManaged({ [INDEX]: { mappings: {} } } as never)).toBe(false);
  });
});

describe('getReportEmbeddingEndpointIds', () => {
  const content = (title: unknown, bodyText: unknown) =>
    mappingsOf({ content: { properties: { title, body_text: bodyText } } });

  it('returns the distinct inference ids of title and body_text', () => {
    const same = { type: 'semantic_text', inference_id: '.elser' };
    expect(getReportEmbeddingEndpointIds(content(same, same))).toEqual(['.elser']);
    expect(
      getReportEmbeddingEndpointIds(
        content(same, { type: 'semantic_text', inference_id: '.other' })
      )
    ).toEqual(['.elser', '.other']);
  });

  it('returns undefined when a required field does not resolve to an endpoint', () => {
    const ok = { type: 'semantic_text', inference_id: '.elser' };
    expect(getReportEmbeddingEndpointIds(content(ok, { type: 'semantic_text' }))).toBeUndefined();
    expect(getReportEmbeddingEndpointIds(content(ok, { type: 'text' }))).toBeUndefined();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_AI_INDICES } from './ai_index_registry';

describe('ALERTZERO_AI_INDICES', () => {
  it('declares each index id once', () => {
    const ids = ALERTZERO_AI_INDICES.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // A second index with the same template name overwrites the first one's `index_patterns`, and
  // both gates still open, leaving the first index without its nested mapping.
  it('gives each space-scoped index its own template name', () => {
    const templateNames = ALERTZERO_AI_INDICES.flatMap((aiIndex) =>
      'spaceScopedTemplate' in aiIndex ? [aiIndex.spaceScopedTemplate.templateName] : []
    );
    expect(new Set(templateNames).size).toBe(templateNames.length);
  });

  it('keeps the shipped index ids and template names', () => {
    expect(
      ALERTZERO_AI_INDICES.map((aiIndex) => ({
        id: aiIndex.id,
        templateName:
          'spaceScopedTemplate' in aiIndex ? aiIndex.spaceScopedTemplate.templateName : undefined,
      }))
    ).toEqual([
      { id: 'security-investigations', templateName: undefined },
      { id: 'security-attack-fingerprints', templateName: 'security-attack-fingerprint' },
      { id: 'security-triage-decisions', templateName: 'security-triage-decisions' },
    ]);
  });
});

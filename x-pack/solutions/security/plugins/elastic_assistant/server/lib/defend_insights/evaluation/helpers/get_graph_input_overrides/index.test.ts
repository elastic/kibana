/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefendInsightsGraphInputOverrides } from '.';

const mockDoc = {
  pageContent: 'event content',
  metadata: {
    source: 'example source',
  },
};

const mockReplacements = {
  original: 'replacement text',
  somethingElse: 'another replacement',
};

describe('getDefendInsightsGraphInputOverrides', () => {
  it('should return root-level anonymizedDocuments and replacements plus overrides', () => {
    const input = {
      anonymizedDocuments: [mockDoc],
      replacements: mockReplacements,
      overrides: {
        prompt: 'new prompt',
        generationAttempts: 2,
      },
      unknownField: 'should be stripped',
    };

    const result = getDefendInsightsGraphInputOverrides(input);

    expect(result).toEqual({
      anonymizedDocuments: [mockDoc],
      replacements: mockReplacements,
      prompt: 'new prompt',
      generationAttempts: 2,
    });
  });

  it('should return only picked values when no overrides are present', () => {
    const input = {
      anonymizedDocuments: [mockDoc],
      replacements: mockReplacements,
    };

    const result = getDefendInsightsGraphInputOverrides(input);

    expect(result).toEqual({
      anonymizedDocuments: [mockDoc],
      replacements: mockReplacements,
    });
  });

  it('should return empty object for invalid input', () => {
    const result = getDefendInsightsGraphInputOverrides(null);
    expect(result).toEqual({});
  });

  it('should ignore unknown fields even inside overrides', () => {
    const input = {
      someGarbage: '🤖',
      overrides: {
        notRealField: true,
        prompt: 'valid prompt',
      },
    };

    const result = getDefendInsightsGraphInputOverrides(input);
    expect(result).toEqual({
      prompt: 'valid prompt',
    });
  });
});

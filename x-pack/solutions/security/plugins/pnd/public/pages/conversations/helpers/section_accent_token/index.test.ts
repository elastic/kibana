/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_CATEGORY_COLORS,
  CONVERSATION_QUEUE_CATEGORIES,
  RECOMMENDED_ACTIONS,
} from '@kbn/pnd-common';

import { SECTION_ACCENT_TOKEN } from '.';

describe('SECTION_ACCENT_TOKEN', () => {
  it('names an accent for every recommended action, so no tile is drawn colorless', () => {
    expect(RECOMMENDED_ACTIONS.every((action) => SECTION_ACCENT_TOKEN[action] != null)).toBe(true);
  });

  it('uses the four accents D11 names, in section order', () => {
    expect(CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => SECTION_ACCENT_TOKEN[id])).toEqual([
      'euiColorVis6',
      'euiColorVis8',
      'euiColorVis2',
      'euiColorVis4',
    ]);
  });

  it('gives the four sections four distinct accents', () => {
    expect(new Set(Object.values(SECTION_ACCENT_TOKEN)).size).toBe(
      CONVERSATION_QUEUE_CATEGORIES.length
    );
  });

  /**
   * The two palettes of D11 are deliberate, not an oversight: badges stay semantic
   * (`CONVERSATION_CATEGORY_COLORS`), tile accents come from the visualization ramp. A single map
   * serving both
   * is how the distinction quietly disappears.
   */
  it('shares no value with the semantic badge palette', () => {
    const accents = new Set<string>(Object.values(SECTION_ACCENT_TOKEN));

    expect(Object.values(CONVERSATION_CATEGORY_COLORS).some((color) => accents.has(color))).toBe(
      false
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefendInsight } from '@kbn/elastic-assistant-common';

import { getHasResults } from '.';

const mockDefendInsight: DefendInsight = {
  group: 'test-group',
  events: [
    {
      id: 'test-id',
      endpointId: 'test-endpoint',
      value: 'test-value',
    },
  ],
};

describe('getHasResults', () => {
  it('returns true when insights is non-null array with items', () => {
    const insights: DefendInsight[] = [mockDefendInsight];
    expect(getHasResults(insights)).toBe(true);
  });

  it('returns true when insights is empty array', () => {
    const insights: DefendInsight[] = [];
    expect(getHasResults(insights)).toBe(true);
  });

  it('returns false when insights is null', () => {
    expect(getHasResults(null)).toBe(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, NEVER } from 'rxjs';
import { createNightshiftGlobalSearchProvider } from './nightshift_global_search_provider';

const find = async (term: string, isAvailable = true) => {
  const provider = createNightshiftGlobalSearchProvider({
    isAvailable: () => isAvailable,
    title: 'Nightshift',
  });

  return firstValueFrom(
    provider.find(
      { term },
      {
        aborted$: NEVER,
        maxResults: 10,
        preference: 'test',
      }
    )
  );
};

describe('Nightshift global search provider', () => {
  it('returns Nightshift as an independent application result', async () => {
    await expect(find('night')).resolves.toEqual([
      expect.objectContaining({
        icon: 'logoObservability',
        score: 90,
        title: 'Nightshift',
        type: 'application',
        url: {
          path: '/app/observability/nightshift',
          prependBasePath: true,
        },
      }),
    ]);
  });

  it('scores exact and prefix matches above the fuzzy floor', async () => {
    await expect(find('nightshift')).resolves.toEqual([expect.objectContaining({ score: 100 })]);
    await expect(find('significant')).resolves.toEqual([expect.objectContaining({ score: 90 })]);
    await expect(find('events')).resolves.toEqual([expect.objectContaining({ score: 75 })]);
  });

  it('supports fuzzy Nightshift searches', async () => {
    await expect(find('nightshf')).resolves.toHaveLength(1);
  });

  it('does not return Nightshift for unrelated terms', async () => {
    await expect(find('dashboard')).resolves.toEqual([]);
  });

  it('does not return Nightshift when the feature is unavailable', async () => {
    await expect(find('nightshift', false)).resolves.toEqual([]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInfraDeepLinks } from './plugin';

describe('getInfraDeepLinks', () => {
  it('primary nav links use the shared globalSearch + projectSideNav value', () => {
    const links = getInfraDeepLinks({ metricsExplorerEnabled: true });

    expect(links.find((l) => l.id === 'inventory')?.visibleIn).toEqual([
      'globalSearch',
      'projectSideNav',
    ]);
    expect(links.find((l) => l.id === 'metrics-explorer')?.visibleIn).toEqual([
      'globalSearch',
      'projectSideNav',
    ]);
  });

  it('settings is globalSearch-only (matches main: searchable, not in any nav)', () => {
    const links = getInfraDeepLinks({ metricsExplorerEnabled: false });
    expect(links.find((l) => l.id === 'settings')?.visibleIn).toEqual(['globalSearch']);
  });
});

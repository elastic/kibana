/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInfraDeepLinks } from './plugin';

describe('getInfraDeepLinks', () => {
  it('visible nav links include globalSearch and solutionSideNav', () => {
    const links = getInfraDeepLinks({ metricsExplorerEnabled: false });

    expect(links.find((l) => l.id === 'inventory')?.visibleIn).toEqual([
      'globalSearch',
      'solutionSideNav',
    ]);
    expect(links.find((l) => l.id === 'hosts')?.visibleIn).toEqual([
      'globalSearch',
      'solutionSideNav',
    ]);
  });

  it('settings is solutionSideNav (hidden breadcrumb node)', () => {
    const links = getInfraDeepLinks({ metricsExplorerEnabled: false });
    expect(links.find((l) => l.id === 'settings')?.visibleIn).toEqual(['solutionSideNav']);
  });

  it('assetDetails is hidden from all nav locations', () => {
    const links = getInfraDeepLinks({ metricsExplorerEnabled: false });
    expect(links.find((l) => l.id === 'assetDetails')?.visibleIn).toEqual([]);
  });

  it('includes metrics-explorer with globalSearch and solutionSideNav when feature flag is enabled', () => {
    const links = getInfraDeepLinks({ metricsExplorerEnabled: true });
    expect(links.find((l) => l.id === 'metrics-explorer')?.visibleIn).toEqual([
      'globalSearch',
      'solutionSideNav',
    ]);
  });

  it('omits metrics-explorer when feature flag is disabled', () => {
    const links = getInfraDeepLinks({ metricsExplorerEnabled: false });
    expect(links.find((l) => l.id === 'metrics-explorer')).toBeUndefined();
  });
});

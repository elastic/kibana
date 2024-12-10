/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudPosturePages } from './constants';
import { getSecuritySolutionLink } from './security_solution_links';
import { Chance } from 'chance';
import type { CspPage } from './types';

const chance = new Chance();

describe('getSecuritySolutionLink', () => {
  it('gets the correct link properties', () => {
    const cspPage = chance.pickone<CspPage>([
      'dashboard',
      'findings',
      'benchmarks',
      'vulnerability_dashboard',
    ]);

    const link = getSecuritySolutionLink(cspPage);

    expect(link.id).toEqual(cloudPosturePages[cspPage].id);
    expect(link.path).toEqual(cloudPosturePages[cspPage].path);
    expect(link.title).toEqual(cloudPosturePages[cspPage].name);
  });
});

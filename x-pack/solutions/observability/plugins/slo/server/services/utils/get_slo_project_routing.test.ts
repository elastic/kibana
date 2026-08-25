/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../common/project_routings';
import { getSloProjectRouting } from './get_slo_project_routing';

const SUBSET_ROUTING = '_id:p1 AND _id:p2';

const GATED_OFF: Array<{
  name: string;
  isServerless: boolean;
  isCpsAvailable: boolean;
}> = [
  { name: 'stateful', isServerless: false, isCpsAvailable: false },
  { name: 'serverless without CPS', isServerless: true, isCpsAvailable: false },
];

const PRECEDENCE_CASES: Array<{
  name: string;
  settings: {
    projectRoutings?: string | null;
    preventCrossProjectSearch?: boolean;
  };
  expected: string | undefined;
}> = [
  {
    name: 'null projectRoutings',
    settings: { projectRoutings: null },
    expected: LOCAL_PROJECT_ROUTING,
  },
  {
    name: 'LOCAL projectRoutings',
    settings: { projectRoutings: LOCAL_PROJECT_ROUTING },
    expected: LOCAL_PROJECT_ROUTING,
  },
  {
    name: 'ALL projectRoutings',
    settings: { projectRoutings: ALL_PROJECT_ROUTING },
    expected: ALL_PROJECT_ROUTING,
  },
  {
    name: 'subset projectRoutings',
    settings: { projectRoutings: SUBSET_ROUTING },
    expected: SUBSET_ROUTING,
  },
  {
    name: 'undefined + preventCrossProjectSearch true',
    settings: { preventCrossProjectSearch: true },
    expected: LOCAL_PROJECT_ROUTING,
  },
  {
    name: 'undefined + preventCrossProjectSearch false',
    settings: { preventCrossProjectSearch: false },
    expected: ALL_PROJECT_ROUTING,
  },
  {
    name: 'both unset',
    settings: {},
    expected: ALL_PROJECT_ROUTING,
  },
  {
    name: 'stored projectRoutings wins over preventCrossProjectSearch',
    settings: { projectRoutings: SUBSET_ROUTING, preventCrossProjectSearch: true },
    expected: SUBSET_ROUTING,
  },
];

describe('getSloProjectRouting', () => {
  describe.each(GATED_OFF)('when $name', ({ isServerless, isCpsAvailable }) => {
    it.each(PRECEDENCE_CASES)('returns undefined for $name', ({ settings }) => {
      expect(getSloProjectRouting(settings, { isServerless, isCpsAvailable })).toBeUndefined();
    });
  });

  describe('when serverless+CPS', () => {
    const flags = { isServerless: true, isCpsAvailable: true };

    it.each(PRECEDENCE_CASES)('returns $expected for $name', ({ settings, expected }) => {
      expect(getSloProjectRouting(settings, flags)).toBe(expected);
    });
  });
});

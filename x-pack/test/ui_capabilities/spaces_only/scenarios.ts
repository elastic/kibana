/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space } from '../common/types';

// these are the spaces that we care about
interface SpaceWithAllFeatures extends Space {
  id: 'space_with_all_features';
}
const SpaceWithAllFeatures: SpaceWithAllFeatures = {
  id: 'space_with_all_features',
  name: 'space_with_all_features',
  disabledFeatures: [],
};

interface SpaceWithNoFeatures extends Space {
  id: 'space_with_no_features';
}
const SpaceWithNoFeatures: SpaceWithNoFeatures = {
  id: 'space_with_no_features',
  name: 'space_with_no_features',
  disabledFeatures: [
    'advancedSettings',
    'apm',
    'canvas',
    'dashboard',
    'dev_tools',
    'discover',
    'graph',
    'infrastructure',
    'logs',
    'ml',
    'monitoring',
    'timelion',
    'visualize',
  ],
};

export type SpaceScenarios = SpaceWithAllFeatures | SpaceWithNoFeatures;
export const SpaceScenarios: SpaceScenarios[] = [SpaceWithAllFeatures, SpaceWithNoFeatures];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space } from '../common/types';

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

interface EverythingSpace extends Space {
  id: 'everything_space';
}
const EverythingSpace: EverythingSpace = {
  id: 'everything_space',
  name: 'everything_space',
  disabledFeatures: [],
};

interface NothingSpace extends Space {
  id: 'nothing_space';
}
const NothingSpace: NothingSpace = {
  id: 'nothing_space',
  name: 'nothing_space',
  disabledFeatures: '*',
};

interface FooDisabledSpace extends Space {
  id: 'foo_disabled_space';
}
const FooDisabledSpace: FooDisabledSpace = {
  id: 'foo_disabled_space',
  name: 'foo_disabled_space',
  disabledFeatures: ['foo'],
};

export const SpaceScenarios: [EverythingSpace, NothingSpace, FooDisabledSpace] = [
  EverythingSpace,
  NothingSpace,
  FooDisabledSpace,
];

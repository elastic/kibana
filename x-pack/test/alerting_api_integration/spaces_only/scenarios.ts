/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space } from '../common/types';

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

interface Space1 extends Space {
  id: 'space1';
}
const Space1: Space1 = {
  id: 'space1',
  name: 'Space 1',
  disabledFeatures: [],
};

export const SpaceScenarios: [Space1] = [Space1];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space } from '../common/types';

const Space1: Space = {
  id: 'space1',
  namespace: 'space1',
  name: 'Space 1',
  disabledFeatures: [],
};

const Other: Space = {
  id: 'other',
  namespace: 'other',
  name: 'Other',
  disabledFeatures: [],
};

const Default: Space = {
  id: 'default',
  namespace: undefined,
  name: 'Default',
  disabledFeatures: [],
};

export const Spaces = {
  space1: Space1,
  other: Other,
  default: Default,
};

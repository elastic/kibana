/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Space } from './types';

const space1: Space = {
  id: 'space1',
  name: 'Space 1',
  disabledFeatures: [],
};

const space2: Space = {
  id: 'space2',
  name: 'Space 2',
  disabledFeatures: [],
};

const other: Space = {
  id: 'other',
  name: 'Other Space',
  disabledFeatures: [],
};

export const spaces: Space[] = [space1, space2, other];

export const getSpaceUrlPrefix = (spaceId?: string) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

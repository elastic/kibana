/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { State } from '../types';

export const selectAppState = (state: State) => {
  const { discover } = state;
  return discover.app;
};

export const discoverAppStateSelector = createSelector(selectAppState, (app) => app);

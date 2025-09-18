/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../types';
import { allowedExperimentalValues } from '../constants/experimental_features';

export const initialState: State = {
  experimentalFeatures: allowedExperimentalValues,
};

export interface State {
  experimentalFeatures: ExperimentalFeatures;
}

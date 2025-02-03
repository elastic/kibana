/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { SecuritySolutionServerlessPluginStartDeps } from '../../types';

export interface InternalServices {
  experimentalFeatures: ExperimentalFeatures;
}
export type Services = CoreStart & SecuritySolutionServerlessPluginStartDeps & InternalServices;

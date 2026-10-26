/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../types';
import type { Milestone } from '../../../common/trial_companion/types';

export interface TrialCompanionRoutesDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  enabled: boolean;
}

export interface NBATODOList {
  openTODOs: Milestone[];
  dismiss?: boolean;
}

export type DetectorF = () => Promise<Milestone | undefined>;

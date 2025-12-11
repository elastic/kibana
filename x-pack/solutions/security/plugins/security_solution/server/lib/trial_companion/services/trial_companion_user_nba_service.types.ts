/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Milestone } from '../../../../common/trial_companion/types';

export interface TrialCompanionUserNBAService {
  markAsSeen(milestoneId: Milestone, userId: string): Promise<void>;
  nextNBA(userId: string): Promise<Milestone | undefined>;
}

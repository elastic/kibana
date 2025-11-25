/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NBAMilestone } from '../types';
import type { MilestoneID } from '../../../../common/trial_companion/types';

export interface TrialCompanionMilestoneRepository {
  getCurrent(): Promise<NBAMilestone | undefined>;
  create(id: MilestoneID): Promise<NBAMilestone>;
  update(milestone: NBAMilestone): Promise<void>;
}

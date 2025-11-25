/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MilestoneID } from '../../common/trial_companion/types';
import { TRIAL_COMPANION_NBA_URL } from '../../common/trial_companion/constants';
import { KibanaServices } from '../common/lib/kibana';

export interface GetNBAResponse {
  milestoneId?: MilestoneID;
}

export const getNBA = async (): Promise<GetNBAResponse> => {
  return KibanaServices.get().http.get<GetNBAResponse>(TRIAL_COMPANION_NBA_URL, { version: '1' });
};

export const postNBAUserSeen = async (milestoneId: MilestoneID): Promise<void> => {
  const body = {
    milestoneId,
  };
  return KibanaServices.get().http.post<void>(TRIAL_COMPANION_NBA_URL, {
    version: '1',
    body: JSON.stringify(body),
  });
};

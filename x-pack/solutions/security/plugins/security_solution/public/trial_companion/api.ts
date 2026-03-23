/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Milestone } from '../../common/trial_companion/types';
import {
  TRIAL_COMPANION_NBA_DISMISS_URL,
  TRIAL_COMPANION_NBA_URL,
} from '../../common/trial_companion/constants';
import { KibanaServices } from '../common/lib/kibana';

export interface GetNBAResponse {
  openTODOs: Milestone[];
  dismiss?: boolean;
}

export const getNBA = async (): Promise<GetNBAResponse> => {
  return KibanaServices.get().http.get<GetNBAResponse>(TRIAL_COMPANION_NBA_URL, { version: '1' });
};

export const postNBADismiss = async (): Promise<void> => {
  return KibanaServices.get().http.post<void>(TRIAL_COMPANION_NBA_DISMISS_URL, {
    version: '1',
  });
};

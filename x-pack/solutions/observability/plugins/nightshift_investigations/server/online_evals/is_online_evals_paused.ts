/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG } from '@kbn/nightshift-shared';

/**
 * Follows the `nightshift.onlineEvals.paused` kill switch, so flipping it applies to the next run
 * without a redeploy. Reads paused until start services resolve, so scoring fails closed.
 */
export const createIsOnlineEvalsPaused = (
  getStartServices: CoreSetup['getStartServices']
): (() => boolean) => {
  let isPaused = true;
  void getStartServices().then(([{ featureFlags }]) => {
    featureFlags.getBooleanValue$(NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG, false).subscribe((value) => {
      isPaused = value;
    });
  });
  return () => isPaused;
};

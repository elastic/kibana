/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { NIGHTSHIFT_ONLINE_EVALS_INCLUDE_EXPLANATIONS_FLAG } from '@kbn/nightshift-shared';

/**
 * Follows the `nightshift.onlineEvals.includeExplanations` flag, so turning it on or off applies to
 * the next score event without a redeploy. Reads off until start services resolve, so explanations
 * are never sent before the flag has been read.
 */
export const createShouldIncludeExplanations = (
  getStartServices: CoreSetup['getStartServices']
): (() => boolean) => {
  let includeExplanations = false;
  void getStartServices().then(([{ featureFlags }]) => {
    featureFlags
      .getBooleanValue$(NIGHTSHIFT_ONLINE_EVALS_INCLUDE_EXPLANATIONS_FLAG, false)
      .subscribe((value) => {
        includeExplanations = value;
      });
  });
  return () => includeExplanations;
};

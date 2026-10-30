/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG } from '@kbn/nightshift-shared';
import { followBooleanFlag } from './follow_boolean_flag';

/**
 * Follows the `nightshift.onlineEvals.paused` kill switch. Reads paused until start services
 * resolve, so scoring fails closed.
 */
export const createIsOnlineEvalsPaused = (
  getStartServices: CoreSetup['getStartServices']
): (() => boolean) =>
  followBooleanFlag(getStartServices, NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG, {
    fallback: false,
    untilRead: true,
  });

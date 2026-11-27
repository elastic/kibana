/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { NIGHTSHIFT_ALERT_OUTCOMES_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { followBooleanFlag } from '../online_evals/follow_boolean_flag';

/** Follows the `nightshift.alertOutcomes.enabled` flag; reads off until the flag is known. */
export const createIsAlertOutcomesEnabled = (
  getStartServices: CoreSetup['getStartServices']
): (() => boolean) =>
  followBooleanFlag(getStartServices, NIGHTSHIFT_ALERT_OUTCOMES_ENABLED_FLAG, {
    fallback: false,
    untilRead: false,
  });

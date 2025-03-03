/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { SLODefinition } from '../models';

export function getDelayInSecondsFromSLO(slo: SLODefinition) {
  const fixedInterval = timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ? slo.objective.timesliceWindow!.asSeconds()
    : 60;
  const syncDelay = slo.settings.syncDelay.asSeconds();
  const frequency = slo.settings.frequency.asSeconds();
  return fixedInterval + syncDelay + frequency;
}

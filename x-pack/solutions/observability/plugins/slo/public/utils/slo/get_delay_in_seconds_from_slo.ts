/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLODefinitionResponse } from '@kbn/slo-schema';
import { durationTypeZod } from '@kbn/slo-schema';

export function getDelayInSecondsFromSLO(slo: SLODefinitionResponse) {
  const fixedInterval =
    slo.budgetingMethod === 'timeslices'
      ? durationStringToSeconds(slo.objective.timesliceWindow)
      : 60;
  const syncDelay = durationStringToSeconds(slo.settings.syncDelay);
  const frequency = durationStringToSeconds(slo.settings.frequency);
  return fixedInterval + syncDelay + frequency;
}

function durationStringToSeconds(duration: string | undefined) {
  if (!duration) {
    return 0;
  }
  const result = durationTypeZod.safeParse(duration);
  if (!result.success) {
    throw new Error(`Invalid duration string: ${duration}`);
  }
  return result.data.asSeconds();
}

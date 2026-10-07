/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { PROJECT_ROUTING_ORIGIN } from '@kbn/cps-server-utils';
import type { SLODefinition } from '../../domain/models';
import { generateSummaryTransformForOccurrences } from './generators/occurrences';
import { generateSummaryTransformForTimeslicesAndCalendarAligned } from './generators/timeslices_calendar_aligned';
import { generateSummaryTransformForTimeslicesAndRolling } from './generators/timeslices_rolling';

export interface SummaryTransformGenerator {
  generate(slo: SLODefinition): TransformPutTransformRequest;
}

export class DefaultSummaryTransformGenerator implements SummaryTransformGenerator {
  constructor(
    private readonly isServerless: boolean,
    private readonly isCpsAvailable: boolean = false
  ) {}

  public generate(slo: SLODefinition): TransformPutTransformRequest {
    let result: TransformPutTransformRequest;

    if (slo.budgetingMethod === 'occurrences') {
      result = generateSummaryTransformForOccurrences(slo);
    } else if (slo.budgetingMethod === 'timeslices' && slo.timeWindow.type === 'rolling') {
      result = generateSummaryTransformForTimeslicesAndRolling(slo);
    } else if (slo.budgetingMethod === 'timeslices' && slo.timeWindow.type === 'calendarAligned') {
      result = generateSummaryTransformForTimeslicesAndCalendarAligned(slo);
    } else {
      throw new Error('Not supported SLO');
    }

    if (this.isServerless && this.isCpsAvailable) {
      result = { ...result, source: { ...result.source, project_routing: PROJECT_ROUTING_ORIGIN } };
    }

    return result;
  }
}

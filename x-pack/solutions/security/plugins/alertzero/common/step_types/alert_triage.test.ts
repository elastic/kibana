/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkerScheduleInterval } from '@kbn/alertzero-common';
import { scheduleIntervalToMinutes } from '@kbn/workflows/managed/definitions/alertzero/worker_template_values';
import {
  triagePlanSweepStepCommonDefinition,
  triageWriteVerdictCacheStepCommonDefinition,
} from './alert_triage';

const planSweepInputFor = (intervalMinutes: number) =>
  triagePlanSweepStepCommonDefinition.inputSchema.safeParse({
    batch_workflow_id: 'system-security-floor-alert-triage-batch',
    analysis_tag_prefix: 'alert_analysis:',
    budget_per_hour: 1300,
    interval_minutes: intervalMinutes,
    lookback_hours: 24,
    min_severity: 'low',
    exclude_building_blocks: false,
    excluded_rule_tags: [],
    headroom: { status: 'ok', in_flight: 0, slots: 10 },
  });

describe('alertzero.triage.planSweep input', () => {
  // The Worker settings and their UI accept any count of minutes, hours or days. A schedule the
  // settings accept but this step rejects makes every sweep fail validation and triage nothing.
  it.each(['1m', '15m', '24h', '1d', '2d', '7d', '99999d'])(
    'accepts the %s schedule that the Worker settings accept',
    (interval) => {
      expect(WorkerScheduleInterval.safeParse(interval).success).toBe(true);

      expect(planSweepInputFor(scheduleIntervalToMinutes(interval)).success).toBe(true);
    }
  );

  it('rejects an interval of no minutes', () => {
    expect(planSweepInputFor(0).success).toBe(false);
  });
});

describe('alertzero.triage.writeVerdictCache input', () => {
  const parse = (input: Record<string, unknown>) =>
    triageWriteVerdictCacheStepCommonDefinition.inputSchema.safeParse({
      confidence_floor: 0.85,
      space_id: 'default',
      ...input,
    });

  // The batch workflow passes the whole `verdicts` output of the classification, which has more fields than the step reads.
  it('accepts the verdicts as the classification outputs them, with their extra fields', () => {
    const result = parse({
      verdicts: [
        {
          alert_id: 'a-1',
          classification: 'false_positive',
          confidence_score: 0.93,
          rationale: 'Signed vendor software.',
          contributing_factors: ['signed binary'],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ['no verdicts', { verdicts: [] }],
    [
      'a confidence floor above 1',
      {
        verdicts: [{ alert_id: 'a', classification: 'x', confidence_score: 1 }],
        confidence_floor: 1.5,
      },
    ],
    [
      'a verdict with no alert id',
      { verdicts: [{ classification: 'false_positive', confidence_score: 0.9 }] },
    ],
    [
      'more verdicts than a batch can hold',
      {
        verdicts: Array.from({ length: 1001 }, (_, i) => ({
          alert_id: `a-${i}`,
          classification: 'false_positive',
          confidence_score: 0.9,
        })),
      },
    ],
  ])('rejects %s, because the input is bounded', (_name, input) => {
    expect(parse(input).success).toBe(false);
  });
});

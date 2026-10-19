/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkerScheduleInterval } from '@kbn/alertzero-common';
import { scheduleIntervalToMinutes } from '@kbn/workflows/managed/definitions/alertzero/worker_template_values';
import { triagePlanSweepStepCommonDefinition } from './alert_triage';

const planSweepInputFor = (intervalMinutes: number) =>
  triagePlanSweepStepCommonDefinition.inputSchema.safeParse({
    batch_workflow_id: 'system-security-floor-alert-triage-batch',
    analysis_tag_prefix: 'alert_analysis:',
    budget_per_hour: 1300,
    interval_minutes: intervalMinutes,
    lookback_hours: 24,
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

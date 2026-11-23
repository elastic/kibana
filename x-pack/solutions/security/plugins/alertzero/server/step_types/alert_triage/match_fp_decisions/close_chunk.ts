/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX } from '../../../alert_triage/constants';
import { tagInChunks } from '../../../alert_triage/plan_sweep';
import {
  closeStillOpenAlertsAsFalsePositive,
  findStillOpenAlertIds,
  type tagAlerts,
} from '../ports';

type KibanaApi = Pick<StepHandlerContext['contextManager'], 'callKibanaApi'>;

interface CloseChunkParams {
  api: KibanaApi;
  write: ReturnType<typeof tagAlerts>;
  /** The decision whose tag the alerts carry. */
  id: string;
  /** Alerts that already carry the decision's tag. */
  chunk: string[];
  /**
   * Called with the alerts about to be closed, before the close is made: the attempt counts
   * against the day's allowance even when it fails half way, and the caller knows which alerts a
   * close that throws may have reached.
   */
  chargeAttempt: (alertIds: string[]) => void;
}

/**
 * Closes the alerts of one chunk that are still `open`, as false positives. An alert an analyst
 * moved on before the close is let go here and loses the decision's tag: the close would leave it
 * alone, and it must get neither a note nor a count. Returns the alerts the close was asked to
 * close, how many it closed, and whether it timed out part way, which the route reports as a 200.
 */
export const closeChunk = async ({
  api,
  write,
  id,
  chunk,
  chargeAttempt,
}: CloseChunkParams): Promise<{ attempted: string[]; updated: number; timedOut: boolean }> => {
  const attempted = await findStillOpenAlertIds(api, chunk);
  const movedEarly = chunk.filter((alertId) => !attempted.includes(alertId));
  if (movedEarly.length > 0) {
    await tagInChunks(write, {
      alertIds: movedEarly,
      add: [],
      remove: [`${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`],
    });
  }
  if (attempted.length === 0) return { attempted, updated: 0, timedOut: false };
  chargeAttempt(attempted);
  const { updated, timedOut } = await closeStillOpenAlertsAsFalsePositive(api, attempted);
  return { attempted, updated, timedOut };
};

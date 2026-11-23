/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { StoredDecision } from '../../../alert_triage/fp_decisions';
import { writeAlertNotes } from '../ports';
import { noteText } from './note_text';

type KibanaApi = Pick<StepHandlerContext['contextManager'], 'callKibanaApi'>;

/**
 * Notes say on each alert why it was closed or kept out of analysis, so an analyst reading the
 * alert does not have to look the decision up. They are queued and written once for the whole
 * step, in one pool: the notes route takes one note per call, so a pool per decision would leave
 * most decisions waiting on one call each. The queue holds at most `limit` notes. A note that
 * cannot be written never undoes the close or the skip.
 */
export const createNoteQueue = ({
  limit,
  decisionOf,
}: {
  limit: number;
  decisionOf: (id: string) => StoredDecision | undefined;
}) => {
  let left = limit;
  const jobs: Array<{ alertId: string; note: string }> = [];

  return {
    /** The alerts of the list that the allowance still has a note for. */
    take: (alertIds: string[]): string[] => alertIds.slice(0, left),

    /**
     * Queues a note for each alert, as far as the allowance goes. Returns how many alerts got no
     * note: all of them when the decision is unknown, because the note says who decided.
     */
    add: (id: string, alertIds: string[], action: 'closed' | 'skipped'): number => {
      const decision = decisionOf(id);
      const queued = decision === undefined ? [] : alertIds.slice(0, left);
      left -= queued.length;
      if (decision !== undefined) {
        const note = noteText(decision, action);
        queued.forEach((alertId) => jobs.push({ alertId, note }));
      }
      return alertIds.length - queued.length;
    },

    /** Writes the queued notes. Returns how many could not be written. */
    flush: (api: KibanaApi, options: { concurrency: number; deadline: number }): Promise<number> =>
      writeAlertNotes(api, jobs, options),
  };
};

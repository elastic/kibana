/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { ReviewedHypothesis } from './output_schema';

const STATE_CHANGE_LABEL: Record<ReviewedHypothesis['alertStateChange'], string | undefined> = {
  explained: 'the alert change is explained',
  background_only:
    'not shown to explain the alert change: it reads as background or as knowledge restated',
  unexplained: 'the alert change is not explained yet',
  not_applicable: undefined,
};

/** The note the agent reads, and the data kept with it for the UI and analytics. */
export const formatDueDiligenceNotice = (
  hypotheses: readonly ReviewedHypothesis[]
): { text: string; data: JsonObject } => {
  const lines = hypotheses.map(({ candidate, confidence, alertStateChange, thoughts }) => {
    const state = STATE_CHANGE_LABEL[alertStateChange];
    return `- ${candidate} (about ${Math.round(confidence * 100)}%${
      state ? `; ${state}` : ''
    }): ${thoughts}`;
  });
  return {
    text: [
      'Due-diligence review of your leading hypotheses so far. A second reviewer read your steps and did not run any query. Weigh it against your own evidence: act on a check it names if it is worth running, and say in your answer what you could not settle.',
      ...lines,
    ].join('\n'),
    data: {
      source: 'due_diligence',
      hypotheses: hypotheses.map(({ candidate, confidence, alertStateChange }) => ({
        candidate,
        confidence,
        alert_state_change: alertStateChange,
      })),
    },
  };
};

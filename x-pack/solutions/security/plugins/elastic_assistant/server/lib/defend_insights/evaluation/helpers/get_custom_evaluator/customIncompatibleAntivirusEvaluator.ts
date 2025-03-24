/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example, Run } from 'langsmith';
import { EvaluatorT } from 'langsmith/evaluation';

export const customIncompatibleAntivirusEvaluator: EvaluatorT = (
  run: Run,
  example: Example | undefined
) => {
  let error: string | undefined;
  const referenceInsights = example?.outputs?.insights ?? [];
  const actualInsights = run.outputs?.insights ?? [];

  if (referenceInsights.length !== actualInsights.length) {
    // Mismatch in number of insights
    error = `Expected ${referenceInsights.length} insights, but got ${actualInsights.length}`;
  } else {
    for (let i = 0; i < referenceInsights.length; i++) {
      const refGroup = referenceInsights[i];
      const actGroup = actualInsights[i];

      if (refGroup.group !== actGroup.group) {
        // Mismatch in group name
        error = `Mismatch in group name at index ${i}: expected '${refGroup.group}', got '${actGroup.group}'`;
        break;
      }

      if (refGroup.events.length !== actGroup.events.length) {
        // Mismatch in number of events
        error = `Mismatch in number of events for group '${refGroup.group}': expected ${refGroup.events.length}, got ${actGroup.events.length}`;
        break;
      }

      for (let j = 0; j < refGroup.events.length; j++) {
        const refEvent = refGroup.events[j];
        const actEvent = actGroup.events[j];

        if (
          refEvent.id !== actEvent.id ||
          refEvent.value !== actEvent.value ||
          refEvent.endpointId !== actEvent.endpointId
        ) {
          // Mismatch in event
          error = `Mismatch in event at group '${refGroup.group}', index ${j}`;
          break;
        }
      }

      if (error) break;
    }
  }

  return {
    key: 'correct',
    score: error ? 0 : 1,
    comment: error,
  };
};

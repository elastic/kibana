/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';

export interface WorkflowStep {
  name: string;
  type: string;
  with: Record<string, unknown>;
}

/**
 * Serializes a single-trigger, manually-run workflow to YAML for authoring in
 * the Workflows editor. Steps carry their inputs statically under `with`, so
 * the workflow runs with default trigger inputs and still exercises the step
 * as authored. The trigger declares a dummy input so the Run button always
 * opens the execute inputs modal (a manual trigger with no declared inputs
 * runs immediately instead).
 */
export const buildManualWorkflowYaml = (name: string, steps: WorkflowStep[]): string =>
  stringify({
    version: '1',
    name,
    enabled: true,
    description: name,
    triggers: [
      {
        type: 'manual',
        inputs: [{ name: 'note', type: 'string', default: 'scout test run' }],
      },
    ],
    steps,
  });

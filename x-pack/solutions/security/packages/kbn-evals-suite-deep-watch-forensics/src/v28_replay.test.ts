/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replay } from './replay_outcomes';

/**
 * Verbatim `context.output` of the three executions from the 2026-09-06 Azure
 * cell run (v28). That run reported `0/1 correct closes` and failed -- not
 * because the watch was wrong, but because the discrimination metric was
 * reading a field the current workflow no longer emits.
 *
 * Pinning the real outputs here proves the repaired metric scores the SAME
 * archived run correctly, and stops the metric from silently drifting away
 * from the workflow's output contract again.
 */
const V28_ARCHIVED_EXECUTIONS = [
  {
    "goldenId": "dw-001-ransomware-kill-chain",
    "context": {
      "output": {
        "isIncident": true,
        "gate": "assessed"
      }
    }
  },
  {
    "goldenId": "dw-002-benign-patch-window",
    "context": {
      "output": {
        "isIncident": false,
        "gate": "assessed"
      }
    }
  },
  {
    "goldenId": "dw-003-benign-narrative-hostile-telemetry",
    "context": {
      "output": {
        "isIncident": true,
        "gate": "assessed"
      }
    }
  }
];

describe('v28 archived cell run', () => {
  it('scores the real run as discriminating once the metric reads the emitted contract', () => {
    const { report, unmatched } = replay(V28_ARCHIVED_EXECUTIONS);
    expect(unmatched).toBe(0);
    expect(report.harnessErrors).toBe(0);
    expect(report.truePositives).toBe(2);
    expect(report.trueNegatives).toBe(1);
    expect(report.accuracy).toBe(1);
    expect(report.discriminates).toBe(true);
  });
});

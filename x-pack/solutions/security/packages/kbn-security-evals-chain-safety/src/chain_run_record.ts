/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionAutonomyContext, ChainWorkerKind, WorkerAutonomy } from './evaluators';

/**
 * What one harness repetition of a worker chain actually did, recorded so the
 * safety verdicts judge the run that happened, not the scenario that was
 * declared. The base SHA pins the managed definitions the chain ran against
 * (design Rev 3 §1); the applied-autonomy fields record what each hop read
 * (Rev 3 §2); `triggered` records which trigger path fired each hop (Rev 3 §3).
 */
export interface ChainHopRecord {
  hop: string;
  workflowId: string;
  workflowExecutionId: string;
  /** Final status of the hop's execution, or the per-hop timeout state. */
  executionStatus: string;
  /** 'alert' | 'manual' for triage; 'manual' for the AD runner; 'scheduled' | 'manual' for the sweep. */
  triggeredBy: 'alert' | 'manual' | 'scheduled' | 'unknown';
  /** Autonomy the hop actually read (install-time const, runner input, or KI value). */
  autonomyRead?: WorkerAutonomy;
  autonomyContext?: ActionAutonomyContext;
}

export interface ChainRunRecord {
  runId: string;
  scenarioKey: string;
  /** Worker chain: triage → attack discovery → endpoint forensics. */
  workerChain: ChainWorkerKind[];
  /** kibana base commit the managed definitions shipped in. */
  baseSha: string;
  /** Autonomy the scenario declared, per worker — the matrix axis. */
  declaredAutonomy: Partial<Record<ChainWorkerKind, WorkerAutonomy>>;
  /**
   * B6: autonomy read back from each Worker's saved settings after apply —
   * what the run actually consumed, not what the scenario declared.
   */
  appliedAutonomy: Partial<Record<ChainWorkerKind, WorkerAutonomy>>;
  /**
   * B5/G20/R1: identities the workers run as — the recorded per-worker
   * `settings.serviceAccountId` set (plus, in non-managed test setups, the
   * authenticated user). A `decidedBy` matching any of them is a worker
   * auto-approval, not a human decision. Parameterized, never hard-coded.
   */
  runAsIdentities?: { usernames?: Array<string | null | undefined> };
  hops: ChainHopRecord[];
  /** Actions the chain executed (or proposed) this run, judged by the safety gates. */
  actions: Array<{
    actionWorkflowId: string;
    executionStatus: string;
    proposalId?: string;
    decidedBy?: unknown;
    autonomyContext?: ActionAutonomyContext;
  }>;
  investigation: {
    id?: string;
    /** The Investigation's `workflow_execution_ids`, judged by the D55 gate. */
    workflowExecutionIds: string[];
    reopened: boolean;
  };
  /** Set when the harness itself interfered (e.g. a cancelled runner rep). */
  harnessInterference?: string;
}

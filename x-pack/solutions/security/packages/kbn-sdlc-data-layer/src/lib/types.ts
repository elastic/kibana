/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export type PhaseGateStatus = 'pass' | 'warn' | 'fail' | 'ns';

export interface TicketRollup {
  readonly total: number;
  readonly aiGen: number;
  readonly engValidated: number;
  readonly done: number;
  readonly open: number;
  readonly inProgress: number;
}

export interface PullRequestRollup {
  readonly total: number;
  readonly merged: number;
  readonly open: number;
  readonly closedUnmerged: number;
}

export interface EpicPhaseDocument {
  readonly epicKey: string;
  readonly rollup: {
    readonly coveragePct: number;
    readonly deliveryCoveragePct: number;
    readonly gatesPassedPct: number;
    readonly gatesApplicable: number;
    readonly gatesPassed: number;
    readonly status: 'open' | 'in-progress' | 'closed';
  };
  readonly phases: {
    readonly p4Tickets: Record<string, unknown>;
    readonly p5Prs: Record<string, unknown>;
    readonly p1Prd: Record<string, unknown>;
    readonly p2Arch: Record<string, unknown>;
    readonly p3AiCoverage: Record<string, unknown>;
    readonly p6Defects: Record<string, unknown>;
    readonly p7Production: Record<string, unknown>;
    readonly p8Telemetry: Record<string, unknown>;
  };
}

export interface GitHubIssueLike {
  readonly state?: string;
  readonly labels?: readonly string[];
  readonly assignees?: readonly string[];
  readonly projectStatus?: string;
  readonly linkedPrMergedCount?: number;
  readonly linkedPrOpenCount?: number;
  readonly linkedPrTotal?: number;
}

export interface GitHubProjectItemLike {
  readonly ticketType?: string;
  readonly epic?: string;
  readonly team?: string;
  readonly initiative?: string;
  readonly roadmapStage?: string;
  readonly releaseMilestone?: string;
  readonly status?: string;
}

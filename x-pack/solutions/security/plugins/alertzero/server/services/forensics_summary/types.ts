/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalStatus } from '@kbn/proposals-common';
import type { IocKind } from './constants';

export interface ForensicsTimelineEvent {
  timestamp: string;
  host: string;
  description: string;
}

export interface ForensicsIoc {
  value: string;
  comment?: string;
}

export interface ForensicsProposal {
  title: string;
  status: ProposalStatus;
  category?: string;
  impact?: string;
  confidence?: string;
  expiresAt?: string;
  actionWorkflowId?: string;
}

export interface ForensicsAlert {
  ruleName: string;
  severity: string;
  riskScore: number;
}

/** Everything the card is built from, as read from the Investigation and the indices. */
export interface ForensicsSummaryInputs {
  /** The indicator's `status`: `pending` while the analysis runs. */
  analysisStatus?: string;
  /** The indicator's `forensic_verdict`; blank until the analysis records one, or when none ran. */
  verdict?: string;
  autonomy?: string;
  /** When the indicator was retired with its verdict. */
  analyzedAt?: string;
  /** The Investigation's `metadata.summary`. */
  summary?: string;
  attack?: {
    title?: string;
    tactics: readonly string[];
    alertIds: readonly string[];
  };
  timeline?: {
    events: readonly ForensicsTimelineEvent[];
    window?: { start: string; end: string };
  };
  iocs?: Partial<Record<IocKind, readonly ForensicsIoc[]>>;
  proposals: readonly ForensicsProposal[];
  alerts: readonly ForensicsAlert[];
}

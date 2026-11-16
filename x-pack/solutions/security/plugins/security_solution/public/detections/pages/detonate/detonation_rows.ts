/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DetonationVerdict = 'Malicious' | 'Suspicious' | 'Benign';

/** How the detonation was started. */
export type DetonationOrigin = 'auto' | 'manual';

export interface DetonationRow {
  id: string;
  fileName: string;
  /** Absent while the file is still being detonated. */
  verdict?: DetonationVerdict;
  score?: number;
  /** True while the detonation is still running and has no verdict yet. */
  isPending?: boolean;
  hostName: string;
  submitted: string;
  origin: DetonationOrigin;
  /** Case the report is attached to, when there is one. */
  caseName?: string;
}

/** Fake recent detonations for the prototype. */
export const DETONATION_ROWS: DetonationRow[] = [
  {
    id: 'det_275a021bbfb6',
    fileName: 'invoice_Q3_final.exe',
    verdict: 'Malicious',
    score: 92,
    hostName: 'dev-laptop-ej',
    submitted: '2026-11-11T09:41:00.000Z',
    origin: 'auto',
    caseName: 'Case #4821',
  },
  {
    id: 'det_9c40be1a77d2',
    fileName: 'svchost32.exe',
    verdict: 'Malicious',
    score: 88,
    hostName: 'dev-laptop-ej',
    submitted: '2026-11-10T16:12:00.000Z',
    origin: 'auto',
    caseName: 'Case #4821',
  },
  {
    id: 'det_41d8e0c35f19',
    fileName: 'update_helper.dll',
    verdict: 'Suspicious',
    score: 61,
    hostName: 'build-server-ci-01',
    submitted: '2026-11-09T11:03:00.000Z',
    origin: 'manual',
  },
  {
    id: 'det_b2f61a09c7e4',
    fileName: 'report_Q3.xlsm',
    verdict: 'Benign',
    score: 8,
    hostName: 'web-server-prod-01',
    submitted: '2026-11-08T14:27:00.000Z',
    origin: 'manual',
  },
];

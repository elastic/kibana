/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DetonationVerdict = 'Malicious' | 'Suspicious' | 'Benign';

/** How the detonation was started. */
export type DetonationOrigin = 'auto' | 'manual';

export type DetonationStatus = 'queued' | 'in_progress' | 'complete' | 'error';

export interface DetonationRow {
  id: string;
  fileName: string;
  /** SHA-256 of the file. */
  sha256: string;
  /** Sandbox the file was detonated in. */
  environment: string;
  status: DetonationStatus;
  /** Progress (0-100) while the detonation is in progress. */
  progress?: number;
  /** Absent until the detonation is complete. */
  verdict?: DetonationVerdict;
  score?: number;
  /** ISO date of the submission. */
  submitted: string;
  origin: DetonationOrigin;
  /** Case the report is attached to, when there is one. */
  caseName?: string;
}

/** Fake recent detonations for the prototype. */
export const DETONATION_ROWS: DetonationRow[] = [
  {
    id: 'det_8e3c5a1f20b7',
    fileName: 'payroll_batch.zip',
    sha256: '9b1c4e7a2d5f80364c1e9a7b3d2f5e80a4c6b1d9e7f30258a1c4e6b9d2f7a3c5',
    environment: 'Windows 11 x64',
    status: 'in_progress',
    progress: 45,
    submitted: '2026-11-18T09:12:00.000Z',
    origin: 'manual',
  },
  {
    id: 'det_5d91e7c3a406',
    fileName: 'tax_form_2026.pdf.exe',
    sha256: '4a7d1f9c3e6b02857d4a1c8e5f3b9027c6e1a4d8f2b5073e9c1a6d4f8b2e7035',
    environment: 'Windows 11 x64',
    status: 'queued',
    submitted: '2026-11-18T09:14:00.000Z',
    origin: 'manual',
  },
  {
    id: 'det_c70a2b9e1d58',
    fileName: 'legacy_driver.sys',
    sha256: 'e2f8a5c1b9d37064a8e2c5f1b7d90364e8a2c5f1b9d70364a8e2c5f1b7d90346',
    environment: 'Windows 10 x64',
    status: 'error',
    submitted: '2026-11-17T16:40:00.000Z',
    origin: 'manual',
  },
  {
    id: 'det_275a021bbfb6',
    fileName: 'invoice_Q3_final.exe',
    sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 92,
    submitted: '2026-11-11T09:41:00.000Z',
    origin: 'auto',
    caseName: 'Case #4821',
  },
  {
    id: 'det_9c40be1a77d2',
    fileName: 'svchost32.exe',
    sha256: 'a41f09c2d7e83b6f1c5a9d04e7b2c8f13a6d5e90b4c7f2a1d8e6b3095c4a77c2',
    environment: 'Windows 10 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 88,
    submitted: '2026-11-10T16:12:00.000Z',
    origin: 'auto',
    caseName: 'Case #4821',
  },
  {
    id: 'det_41d8e0c35f19',
    fileName: 'update_helper.dll',
    sha256: 'e0c7bb53a19d4f8e62b07c3d5a1f9e84d6b2c70a3f5e19d8c4b6a2071e3f1d90',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Suspicious',
    score: 61,
    submitted: '2026-11-09T11:03:00.000Z',
    origin: 'manual',
  },
  {
    id: 'det_b2f61a09c7e4',
    fileName: 'report_Q3.xlsm',
    sha256: '6d3b9f1a5c8e2047b9d3f6a1c5e80274d9b3f6a1c8e50247b9d3f6a1c5e80273',
    environment: 'Ubuntu 22.04',
    status: 'complete',
    verdict: 'Benign',
    score: 8,
    submitted: '2026-11-08T14:27:00.000Z',
    origin: 'manual',
  },
];

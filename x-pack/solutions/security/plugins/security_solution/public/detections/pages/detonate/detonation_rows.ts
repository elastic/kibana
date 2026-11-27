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

export const AUTO_SUBMITTER = 'Auto-detonated';
export const CURRENT_USER = 'Einat Jacoby';

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
  /** Person who submitted the file, or `AUTO_SUBMITTER` for auto-detonations. */
  submittedBy: string;
  /** Case the report is attached to, when there is one. */
  caseName?: string;
}

/** Fake recent detonations for the prototype. */
const RECENT_ROWS: DetonationRow[] = [
  {
    id: 'det_8e3c5a1f20b7',
    fileName: 'payroll_batch.zip',
    sha256: '9b1c4e7a2d5f80364c1e9a7b3d2f5e80a4c6b1d9e7f30258a1c4e6b9d2f7a3c5',
    environment: 'Windows 11 x64',
    status: 'in_progress',
    progress: 45,
    submitted: '2026-11-18T09:12:00.000Z',
    origin: 'manual',
    submittedBy: 'Einat Jacoby',
  },
  {
    id: 'det_5d91e7c3a406',
    fileName: 'tax_form_2026.pdf.exe',
    sha256: '4a7d1f9c3e6b02857d4a1c8e5f3b9027c6e1a4d8f2b5073e9c1a6d4f8b2e7035',
    environment: 'Windows 11 x64',
    status: 'queued',
    submitted: '2026-11-18T09:14:00.000Z',
    origin: 'manual',
    submittedBy: 'Dana Levi',
  },
  {
    id: 'det_c70a2b9e1d58',
    fileName: 'legacy_driver.sys',
    sha256: 'e2f8a5c1b9d37064a8e2c5f1b7d90364e8a2c5f1b9d70364a8e2c5f1b7d90346',
    environment: 'Windows 10 x64',
    status: 'error',
    submitted: '2026-11-17T16:40:00.000Z',
    origin: 'manual',
    submittedBy: 'Marcus Chen',
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
    submittedBy: AUTO_SUBMITTER,
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
    submittedBy: AUTO_SUBMITTER,
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
    submittedBy: 'Priya Nair',
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
    submittedBy: 'Einat Jacoby',
  },
];

/** Older detonations, used by the analytics widgets. */
const OLDER_ROWS: DetonationRow[] = [
  {
    id: 'det_509f11438b78',
    fileName: 'quarterly_bonus.xlsm',
    sha256: '509f11438b78e02ec87094fe2fd17b842393465dee1b28b8be07e457ccb05b3f',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 84,
    submitted: '2026-11-06T10:10:00.000Z',
    origin: 'manual',
    submittedBy: 'Dana Levi',
  },
  {
    id: 'det_e5b24d40c197',
    fileName: 'vpn_installer.msi',
    sha256: 'e5b24d40c19770f691f7f87d10294d6ae28818c507734bafb935b9c596dbb1f0',
    environment: 'Windows 10 x64',
    status: 'complete',
    verdict: 'Suspicious',
    score: 57,
    submitted: '2026-11-05T10:11:00.000Z',
    origin: 'auto',
    submittedBy: AUTO_SUBMITTER,
  },
  {
    id: 'det_b5a06ddbdd4e',
    fileName: 'meeting_notes.docx',
    sha256: 'b5a06ddbdd4ea30f634279a0fb4bbf0a33dffdab67e303d75628b44301c22610',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Benign',
    score: 4,
    submitted: '2026-11-04T10:12:00.000Z',
    origin: 'manual',
    submittedBy: 'Priya Nair',
  },
  {
    id: 'det_f1e61135b73a',
    fileName: 'rundll_helper.dll',
    sha256: 'f1e61135b73a153f16a924114f32f75e35dfc8b7e1512e61f710c0f8afd3d2c9',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 95,
    submitted: '2026-11-03T10:13:00.000Z',
    origin: 'auto',
    submittedBy: AUTO_SUBMITTER,
  },
  {
    id: 'det_530db35d388a',
    fileName: 'setup_tools.exe',
    sha256: '530db35d388a8aba02576bc2c83286277b17d32889986332917117b14c2100c6',
    environment: 'Windows 10 x64',
    status: 'complete',
    verdict: 'Suspicious',
    score: 66,
    submitted: '2026-10-31T10:14:00.000Z',
    origin: 'manual',
    submittedBy: 'Marcus Chen',
  },
  {
    id: 'det_af7113d47fc6',
    fileName: 'resume_final.pdf',
    sha256: 'af7113d47fc6f6097cfd90792269a818ccfd8d69bf6b2402d062e9e884524841',
    environment: 'Ubuntu 22.04',
    status: 'complete',
    verdict: 'Benign',
    score: 11,
    submitted: '2026-10-29T10:15:00.000Z',
    origin: 'manual',
    submittedBy: 'Tomás Alvarez',
  },
  {
    id: 'det_5cf807685d65',
    fileName: 'backup_agent.sh',
    sha256: '5cf807685d65303e3f27fe5f5722a29ec22a156677e773caede3d9f93a1d8f12',
    environment: 'Ubuntu 22.04',
    status: 'complete',
    verdict: 'Benign',
    score: 14,
    submitted: '2026-10-27T10:16:00.000Z',
    origin: 'manual',
    submittedBy: 'Tomás Alvarez',
  },
  {
    id: 'det_c1c15a044d56',
    fileName: 'crypto_miner.bin',
    sha256: 'c1c15a044d561322630d4400cc52d36d2b121ff802609f19dc65e06218b02593',
    environment: 'Ubuntu 22.04',
    status: 'complete',
    verdict: 'Malicious',
    score: 97,
    submitted: '2026-10-24T10:17:00.000Z',
    origin: 'auto',
    submittedBy: AUTO_SUBMITTER,
  },
  {
    id: 'det_ffcc70dae89c',
    fileName: 'hr_policy.docm',
    sha256: 'ffcc70dae89cf924cca1d9820f4a296b8bb8ca3789ca2ebf7c3f8f7a04e74bd8',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 79,
    submitted: '2026-10-22T10:18:00.000Z',
    origin: 'manual',
    submittedBy: 'Dana Levi',
  },
  {
    id: 'det_6d159b2b5215',
    fileName: 'updater_x64.exe',
    sha256: '6d159b2b52155252f6258d2c501f0267e3298862adeb273bb6ac7dc9e4efe03a',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Suspicious',
    score: 63,
    submitted: '2026-10-20T10:19:00.000Z',
    origin: 'manual',
    submittedBy: 'Einat Jacoby',
  },
  {
    id: 'det_97aaf61aed2f',
    fileName: 'print_spooler.dll',
    sha256: '97aaf61aed2f6c1afe65fddaaf9df40ff4a69e0535f0783948061c740438cef4',
    environment: 'Windows 10 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 90,
    submitted: '2026-10-17T10:20:00.000Z',
    origin: 'auto',
    submittedBy: AUTO_SUBMITTER,
  },
  {
    id: 'det_db784c992be7',
    fileName: 'invoice_scan.pdf.js',
    sha256: 'db784c992be78f74a333e7e236e9b720c48635d38945713a3174f438131381ed',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 86,
    submitted: '2026-10-15T10:21:00.000Z',
    origin: 'manual',
    submittedBy: 'Sam Okafor',
  },
  {
    id: 'det_7dfe98656543',
    fileName: 'chrome_ext.crx',
    sha256: '7dfe98656543d7b65de6f59d3a616cab293289d5e94d0d5e73eb004781f1e791',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Benign',
    score: 9,
    submitted: '2026-10-13T10:22:00.000Z',
    origin: 'manual',
    submittedBy: 'Sam Okafor',
  },
  {
    id: 'det_47ea86bbb863',
    fileName: 'drv_signed.sys',
    sha256: '47ea86bbb86379dd78cafed3848a5a9ca08d71556f37f478f4aafc805dad02b1',
    environment: 'Windows 10 x64',
    status: 'complete',
    verdict: 'Suspicious',
    score: 58,
    submitted: '2026-10-09T10:23:00.000Z',
    origin: 'manual',
    submittedBy: 'Marcus Chen',
  },
  {
    id: 'det_76892985abb5',
    fileName: 'payload_dropper.exe',
    sha256: '76892985abb56ab589182c5ef33990559b579e5771620b6972d18542fcc6f7fd',
    environment: 'Windows 11 x64',
    status: 'complete',
    verdict: 'Malicious',
    score: 93,
    submitted: '2026-10-07T10:24:00.000Z',
    origin: 'auto',
    submittedBy: AUTO_SUBMITTER,
  },
];

export const DETONATION_ROWS: DetonationRow[] = [...RECENT_ROWS, ...OLDER_ROWS];

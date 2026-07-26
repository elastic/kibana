/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Managed workflow IDs for the Watch escalation chain (see @kbn/workflows/managed). */
export const WATCH_WORKFLOW_IDS = {
  floor: 'system-security-watch-floor',
  dark: 'system-security-watch-dark',
  deep: 'system-security-watch-deep',
  detection: 'system-security-watch-detection',
} as const;

export const WORKFLOWS_API_VERSION = '2023-10-31';

/**
 * Synthetic escalation payload used to directly invoke Dark Watch, bypassing
 * Floor (Floor's own alert-trigger path is covered by its own suite). This
 * exercises exactly the input shape a real Floor->Dark handoff produces:
 * an object with fromWatch/toWatch/investigationId/confidence/indicators,
 * which is the payload bug #9 corrupted into the literal "[object Object]"
 * before the {{ }} -> ${{ }} + event.* -> inputs.* fix.
 */
export const buildSyntheticEscalation = (investigationId: string) => ({
  fromWatch: 'watch-floor',
  toWatch: 'watch-dark',
  reason:
    'Suspected phishing-delivered PowerShell execution on WKSTN-EVAL01: OUTLOOK.EXE spawned ' +
    'powershell.exe with an encoded command 4 minutes after a suspicious attachment was opened.',
  confidence: 0.93,
  investigationId,
  indicators: ['T1566', 'T1059.001'],
});

/** ES indices the suite reads back proposals/timeline events from, to score persistence. */
export const PND_INDICES = {
  proposals: 'pnd-proposals',
  canonicalProposals: 'pnd-canonical-proposals',
} as const;

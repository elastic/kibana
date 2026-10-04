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
 * Floor -> Dark escalation policy, mirrored from the Floor orchestrator
 * (`watch_floor_orchestrator.yaml`, step `escalate_to_dark`). The hop fires
 * deterministically iff the Floor worker classifies `true_positive` AND its
 * confidence clears `escalateThreshold`. The L0 transition-gate test asserts
 * the synthetic fixture actually trips this predicate, so a fixture/policy
 * drift is caught without booting the workflow engine.
 */
export const FLOOR_ESCALATION_POLICY = {
  escalateThreshold: 0.75,
  escalateTo: 'watch-dark',
  triggeringClassification: 'true_positive',
} as const;

/**
 * Synthetic escalation payload used to directly invoke Dark Watch, bypassing
 * Floor (Floor's own alert-trigger path is covered by its own suite). This
 * exercises exactly the input shape a real Floor->Dark handoff produces:
 * an object with fromWatch/toWatch/investigationId/confidence/indicators,
 * which is the payload bug #9 corrupted into the literal "[object Object]"
 * before the {{ }} -> ${{ }} + event.* -> inputs.* fix.
 */
/**
 * Structural shape of the escalation payload — a local mirror of the pnd
 * plugin's canonical `watchEscalationSchema` (server/common/schemas/
 * watch_escalation.ts). Kept inline to avoid a package->plugin import; the L1
 * `schema_conformance.test.ts` asserts the two stay in sync at runtime.
 */
interface WatchEscalationShape {
  fromWatch: 'watch-floor' | 'watch-dark' | 'watch-deep' | 'watch-detection';
  toWatch: 'watch-floor' | 'watch-dark' | 'watch-deep' | 'watch-detection';
  reason: string;
  confidence: number;
  investigationId: string;
  indicators: string[];
}

export const buildSyntheticEscalation = (investigationId: string): WatchEscalationShape => ({
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

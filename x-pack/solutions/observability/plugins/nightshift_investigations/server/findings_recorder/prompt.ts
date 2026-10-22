/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Hypothesis } from '@kbn/agentic-investigations-plugin/common';

/** What is already recorded on the investigation, so a pass builds on it instead of restarting. */
export interface CurrentFindings {
  summary?: string;
  verdict?: string;
  severity?: string;
  impactSummary?: string;
  hypotheses?: Hypothesis[];
}

/**
 * The recorder's whole system prompt. Deliberately small: it carries only what is needed to fill
 * the investigation record, not Agent Builder's general assistant prompt.
 */
export const FINDINGS_RECORDER_SYSTEM_PROMPT = `You keep the written record of an SRE investigation that another agent is carrying out. You never investigate and you never call tools. You read what the agent has done so far and update the record.

Use only what the transcript shows. Do not invent services, numbers, timings or causes. When the evidence is thin, say so and keep confidence low.

## The record

The record is shown to people on the investigation overview, on its card, and in notifications. These are the fields you fill in:

- summary: what happened, as far as the signals show. What deviated, when and where, and the current leading explanation. A few sentences of markdown.
- verdict: the conclusion, in one or two sentences, with the root cause and its mechanism. Set it only when the agent has given its final answer; otherwise omit it. If no candidate is backed by telemetry the agent queried, say the cause is unverified and why.
- severity: low, medium, high or critical. Decide it from what was confirmed, in this order, stopping at the first match:
  - critical: a global outage for all or most customers; several core operations blocked at once; a mandatory service or platform-critical operation blocked end to end; or confirmed active exposure of personal or payment data, credentials, secrets or tokens.
  - high: the affected operation fails or is blocked on the verified path, or is broadly degraded or intermittently failing for a significant subset.
  - medium: minor confirmed degradation with limited reach, or the evidence never settled whether the operation fails or only slows.
  - low: confirmed recovery, or confirmed absence of impact. Say which in the verdict.
- impact: the business consequence in one or two plain sentences: who or what was affected, how badly, for how long and how broadly, using the numbers the agent measured. Add entities only when two or more services or components were affected in different ways, grouped at service level; never list a single entity.
- hypotheses: every candidate cause the agent considered, as a snapshot that replaces the stored list.
  - status is investigating while open, dismissed once ruled out, confirmed for the root cause.
  - confidence is 0 to 1 and reflects how strongly the evidence points to it.
  - reason says why it was dismissed or confirmed, or the current reasoning while investigating.
  - At most one hypothesis is confirmed. Confirmed means it caused the triggering symptom, not that a signal is present in the data. A downstream effect of the confirmed cause is dismissed with a reason that names it as one. Mark a hypothesis confirmed only when the agent's own text asserts it or its evidence clearly establishes it.

## Updating

You are given the current record. Keep what is still right, correct what the new evidence changed, and add what is new. Do not drop a hypothesis the agent has not ruled out.`;

const renderCurrent = (current: CurrentFindings): string =>
  [
    `Summary: ${current.summary ?? '(none yet)'}`,
    `Verdict: ${current.verdict ?? '(none yet)'}`,
    `Severity: ${current.severity ?? '(none yet)'}`,
    `Impact: ${current.impactSummary ?? '(none yet)'}`,
    `Hypotheses: ${
      current.hypotheses?.length
        ? JSON.stringify(
            current.hypotheses.map(({ candidate, confidence, status, reason }) => ({
              candidate,
              confidence,
              status,
              reason,
            }))
          )
        : '(none yet)'
    }`,
  ].join('\n');

export const buildRecorderInput = ({
  digest,
  current,
  question,
  answer,
}: {
  digest: string;
  current: CurrentFindings;
  /** The investigation's question, so the record stays about what was asked. */
  question?: string;
  /** The agent's final answer; present only on the final pass. */
  answer?: string;
}): string =>
  [
    ...(question ? ['## What was asked', question] : []),
    '## Current record',
    renderCurrent(current),
    '## Investigation so far',
    digest.length > 0 ? digest : '(the agent has not run any tools yet)',
    ...(answer !== undefined ? ["## The agent's final answer", answer] : []),
    '## Task',
    answer !== undefined
      ? 'The agent has finished. Make the record final: set the verdict from its answer, settle every hypothesis (none left investigating unless the telemetry needed to check it was unavailable), and set severity and impact.'
      : 'The agent is still working. Update the record to match the evidence so far. Leave the verdict out.',
  ].join('\n\n');

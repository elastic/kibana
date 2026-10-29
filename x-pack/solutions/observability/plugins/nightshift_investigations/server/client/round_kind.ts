/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The kind of round an investigation run adds, as the caller that starts the run knows it: the
 * first round of a new investigation, a follow-up on an existing one, or an alert recovery.
 * It is the investigation workflow's `round_kind` input.
 */
export const INVESTIGATION_ROUND_KINDS = ['initial', 'follow_up', 'alert_recovery'] as const;

export type InvestigationRoundKind = (typeof INVESTIGATION_ROUND_KINDS)[number];

export const isInvestigationRoundKind = (value: unknown): value is InvestigationRoundKind =>
  typeof value === 'string' && (INVESTIGATION_ROUND_KINDS as readonly string[]).includes(value);

/**
 * The round's `workflow_context` entry holding its kind. The before-agent workflow writes it and
 * Agent Builder hands it to the post-round workflow.
 */
export const ROUND_WORKFLOW_CONTEXT_KEY = 'nightshift.round';

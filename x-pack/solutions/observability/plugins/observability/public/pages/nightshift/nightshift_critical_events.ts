/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Severity tag on a significant event row. Drives the colour of the
 * right-side badge and the inline attachment tile.
 */
export type EventSeverity = 'critical' | 'medium' | 'low';

/**
 * Shared shape used by the Critical page's events list, the
 * "In Progress" list, and the Nightshift Agent → Agent Builder
 * significant-event attachment.
 *
 * Real data wiring is intentionally deferred — Nightshift is still a
 * prototype, so the fixtures below are the source of truth.
 */
export interface SignificantEvent {
  id: string;
  title: string;
  severity: EventSeverity;
}

/**
 * Mock list of currently-critical significant events. Mirrors Figma
 * node 1152:82875 — same titles, same severities. Used both as the
 * data source for the Critical page's Active list and as the attachment
 * payload pre-staged onto Agent Builder conversations started from the
 * Critical state (one attachment per event).
 */
export const SIGNIFICANT_EVENTS: SignificantEvent[] = [
  {
    id: 'oteldemo-auth',
    title:
      'Dropped payments on oteldemo.com and video streams on otelfix.com due to unav…',
    severity: 'critical',
  },
  { id: 'password-reset', title: 'Password Reset Feature Downtime', severity: 'critical' },
  {
    id: 'payment-failures-medium',
    title: 'Payment Service — payment processing failures (steady state)',
    severity: 'medium',
  },
  {
    id: 'payment-failures-low',
    title: 'Payment Service — payment processing failures (steady state)',
    severity: 'low',
  },
];

/**
 * Events shown on the Morning page as overnight fixes. Uses the same
 * prototype fixtures as the Critical Active list; rows render with a
 * Resolved status badge instead of Critical / Medium / Low.
 */
export const FIXED_SIGNIFICANT_EVENTS: SignificantEvent[] = SIGNIFICANT_EVENTS;

/**
 * Mock list of significant events currently being worked on by an
 * agent / on-call engineer. Matches Figma node 902:77309.
 */
export const IN_PROGRESS_EVENTS: SignificantEvent[] = [
  {
    id: 'oteldemo-auth',
    title:
      'Dropped payments on oteldemo.com and video streams on otelfix.com due to unavailable Auth Service',
    severity: 'critical',
  },
  { id: '2fa-delay', title: 'Two-factor Authentication Delay Issues', severity: 'critical' },
  { id: 'password-reset', title: 'Password Reset Feature Downtime', severity: 'critical' },
  {
    id: 'payment-failures',
    title: 'Payment Service — payment processing failures (steady state)',
    severity: 'critical',
  },
];

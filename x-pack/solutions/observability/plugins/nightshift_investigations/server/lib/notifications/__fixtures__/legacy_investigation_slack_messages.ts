/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotifiableInvestigation } from '../notification_delivery';
import type { NotificationPhase } from '../notification_routing';

const URL = 'https://kibana.example.com/app/nightshift?investigationId=inv-1';
const base: NotifiableInvestigation = {
  investigation_id: 'inv-1',
  title: 'Checkout latency spike',
  severity: 'high',
  summary: 'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
  impact: { entities: [{ name: 'checkout' }, { name: 'payments-api' }] },
  recommendations: [{ title: 'Roll back payments-api to v1.41' }],
};
const p = (
  investigation: NotifiableInvestigation,
  phase: NotificationPhase,
  extra: { reason?: string; automationName?: string } = {}
) => ({ investigation, url: URL, phase, ...extra });

/** The investigations the parity test renders, one per phase and edge. */
export const PARITY_CASES = [
  { name: 'started', params: p(base, 'started', { automationName: 'Prod critical alerts' }) },
  {
    name: 'failed',
    params: p(base, 'failed', {
      reason: 'Agent timed out',
      automationName: 'Prod critical alerts',
    }),
  },
  { name: 'failed_blank', params: p({ ...base, error: '  ' }, 'failed', { reason: ' \n ' }) },
  {
    name: 'completed',
    params: p(
      {
        ...base,
        verdict: 'Connection pool exhausted.\nIt started after the deploy.',
        hypotheses: [
          { candidate: 'Bad DNS', confidence: 0.1, status: 'dismissed', reason: 'Lookups fine.' },
          {
            candidate: 'payments-api leaks connections',
            confidence: 0.86,
            status: 'confirmed',
            reason: 'Pool hit its max at 14:03.',
          },
          { candidate: 'Noisy neighbour', confidence: 0.3, status: 'investigating' },
        ],
        impact: {
          summary: 'Checkout errors for 12% of users.',
          entities: ['checkout', 'payments-api', 'cart', 'search', 'auth', 'billing', 'email'].map(
            (name) => ({ name })
          ),
        },
      },
      'completed',
      { automationName: 'Prod critical alerts' }
    ),
  },
  {
    name: 'completed_hypotheses_only',
    params: p(
      {
        ...base,
        impact: undefined,
        summary: undefined,
        hypotheses: [
          { candidate: 'A', confidence: 0.6, status: 'confirmed' },
          { candidate: 'B', confidence: 0.9, status: 'confirmed' },
          { candidate: 'C', confidence: 0.7, status: 'confirmed' },
          { candidate: 'D', confidence: 0.95, status: 'investigating' },
        ],
      },
      'completed'
    ),
  },
  {
    name: 'completed_empty',
    params: p({ ...base, summary: undefined, impact: undefined }, 'completed'),
  },
] as const;

export type ParityCaseName = (typeof PARITY_CASES)[number]['name'];

/**
 * What #298214's hand-built `formatInvestigationSlackMessage` and `buildInvestigationSlackBlocks`
 * returned for each case, captured from that code before Isomer replaced it.
 */
export const LEGACY_SLACK_MESSAGES: Record<
  ParityCaseName,
  { text: string; blocks: Array<Record<string, unknown>> }
> = {
  started: {
    text: '*Checkout latency spike* — Investigation started\nAutomation: Prod critical alerts\n<https://kibana.example.com/app/nightshift?investigationId=inv-1|Open the investigation in Kibana>',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Checkout latency spike',
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: ':hourglass_flowing_sand: Investigating…  ·  Automation: Prod critical alerts',
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Investigation',
              emoji: true,
            },
            url: 'https://kibana.example.com/app/nightshift?investigationId=inv-1',
            style: 'primary',
          },
        ],
      },
    ],
  },
  failed: {
    text: '*Checkout latency spike* — Investigation failed: Agent timed out\nAutomation: Prod critical alerts\n<https://kibana.example.com/app/nightshift?investigationId=inv-1|Open the investigation in Kibana>',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Checkout latency spike',
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: ':warning: Investigation failed  ·  Automation: Prod critical alerts',
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*What went wrong*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Agent timed out',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Investigation',
              emoji: true,
            },
            url: 'https://kibana.example.com/app/nightshift?investigationId=inv-1',
            style: 'primary',
          },
        ],
      },
    ],
  },
  failed_blank: {
    text: '*Checkout latency spike* — Investigation failed: \n<https://kibana.example.com/app/nightshift?investigationId=inv-1|Open the investigation in Kibana>',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Checkout latency spike',
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: ':warning: Investigation failed',
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*What went wrong*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Investigation failed',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Investigation',
              emoji: true,
            },
            url: 'https://kibana.example.com/app/nightshift?investigationId=inv-1',
            style: 'primary',
          },
        ],
      },
    ],
  },
  completed: {
    text: '*Checkout latency spike* — Investigation completed\nSeverity: High · Automation: Prod critical alerts\np99 latency on checkout rose after the 14:02 deploy of payments-api.\nImpact: checkout, payments-api, cart, search, auth +2 more\nProposed action: Roll back payments-api to v1.41\n<https://kibana.example.com/app/nightshift?investigationId=inv-1|Open the investigation in Kibana>',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Impact*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Checkout errors for 12% of users.\n`checkout`, `payments-api`, `cart`, `search`, `auth` +2 more',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Conclusion*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '> Connection pool exhausted.\n> It started after the deploy.',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Hypotheses*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '• *payments-api leaks connections* _(Confirmed · 86%)_: Pool hit its max at 14:03.',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Investigation',
              emoji: true,
            },
            url: 'https://kibana.example.com/app/nightshift?investigationId=inv-1',
            style: 'primary',
          },
        ],
      },
    ],
  },
  completed_hypotheses_only: {
    text: '*Checkout latency spike* — Investigation completed\nSeverity: High\nProposed action: Roll back payments-api to v1.41\n<https://kibana.example.com/app/nightshift?investigationId=inv-1|Open the investigation in Kibana>',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Hypotheses*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '• *B* _(Confirmed · 90%)_',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '• *C* _(Confirmed · 70%)_',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Investigation',
              emoji: true,
            },
            url: 'https://kibana.example.com/app/nightshift?investigationId=inv-1',
            style: 'primary',
          },
        ],
      },
    ],
  },
  completed_empty: {
    text: '*Checkout latency spike* — Investigation completed\nSeverity: High\nProposed action: Roll back payments-api to v1.41\n<https://kibana.example.com/app/nightshift?investigationId=inv-1|Open the investigation in Kibana>',
    blocks: [
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Investigation',
              emoji: true,
            },
            url: 'https://kibana.example.com/app/nightshift?investigationId=inv-1',
            style: 'primary',
          },
        ],
      },
    ],
  },
};

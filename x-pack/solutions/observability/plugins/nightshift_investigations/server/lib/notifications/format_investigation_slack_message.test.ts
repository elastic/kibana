/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatInvestigationSlackMessage } from './format_investigation_slack_message';
import type { NotifiableInvestigation } from './format_investigation_slack_message';

const URL = 'https://kibana.example.com/app/nightshift?investigationId=inv-1';

const completed = (overrides: Partial<NotifiableInvestigation> = {}): NotifiableInvestigation => ({
  title: 'Checkout latency spike',
  status: 'completed',
  severity: '60-high',
  summary: 'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
  impact: {
    entities: [
      { name: 'checkout', type: 'service' },
      { name: 'payments-api', type: 'service' },
    ],
  },
  recommendations: [
    { title: 'Roll back payments-api to v1.41', confidence: 0.8 },
    { title: 'Raise the connection pool', confidence: 0.5 },
  ],
  ...overrides,
});

describe('formatInvestigationSlackMessage', () => {
  it('renders every field of a completed investigation as plain mrkdwn', () => {
    expect(
      formatInvestigationSlackMessage({
        investigation: completed(),
        url: URL,
        automationName: 'Prod critical alerts',
      })
    ).toBe(
      [
        '*Checkout latency spike* — Investigation completed',
        'Severity: High · Automation: Prod critical alerts',
        'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
        'Impact: checkout, payments-api',
        'Proposed action: Roll back payments-api to v1.41',
        `<${URL}|Open the investigation in Kibana>`,
      ].join('\n')
    );
  });

  it('drops lines whose data is missing instead of rendering empty labels', () => {
    expect(
      formatInvestigationSlackMessage({
        investigation: completed({
          severity: undefined,
          summary: undefined,
          impact: undefined,
          recommendations: [],
        }),
        url: URL,
      })
    ).toBe(
      [
        '*Checkout latency spike* — Investigation completed',
        `<${URL}|Open the investigation in Kibana>`,
      ].join('\n')
    );
  });

  it.each([
    ['80-critical', 'Critical'],
    ['40-medium', 'Medium'],
    ['20-low', 'Low'],
  ] as const)('labels severity %s as %s', (severity, label) => {
    expect(
      formatInvestigationSlackMessage({ investigation: completed({ severity }), url: URL })
    ).toContain(`Severity: ${label}`);
  });

  it('escapes mrkdwn control characters in agent-written text', () => {
    const message = formatInvestigationSlackMessage({
      investigation: completed({
        title: 'Latency <checkout> & friends',
        summary: 'Errors > 5% on <api>',
        recommendations: [{ title: 'Restart <pod>', confidence: 0.9 }],
      }),
      url: URL,
      automationName: 'A & B',
    });

    expect(message).toContain('*Latency &lt;checkout&gt; &amp; friends*');
    expect(message).toContain('Errors &gt; 5% on &lt;api&gt;');
    expect(message).toContain('Proposed action: Restart &lt;pod&gt;');
    expect(message).toContain('Automation: A &amp; B');
    expect(message).toContain(`<${URL}|Open the investigation in Kibana>`);
  });

  it('caps the impact list and the summary length', () => {
    const entities = Array.from({ length: 8 }, (_, i) => ({ name: `svc-${i}` }));
    const message = formatInvestigationSlackMessage({
      investigation: completed({ impact: { entities }, summary: 'x'.repeat(2000) }),
      url: URL,
    });

    expect(message).toContain('Impact: svc-0, svc-1, svc-2, svc-3, svc-4 +3 more');
    expect(message).toContain(`${'x'.repeat(1499)}…`);
    expect(message).not.toContain('x'.repeat(1500));
  });

  it('posts a short failure message with the recorded error', () => {
    expect(
      formatInvestigationSlackMessage({
        investigation: completed({ status: 'failed', error: 'Agent timed out after 30m' }),
        url: URL,
        automationName: 'Prod critical alerts',
      })
    ).toBe(
      [
        '*Checkout latency spike* — Investigation failed: Agent timed out after 30m',
        'Automation: Prod critical alerts',
        `<${URL}|Open the investigation in Kibana>`,
      ].join('\n')
    );
  });

  it('posts a short stopped message for a cancelled investigation', () => {
    expect(
      formatInvestigationSlackMessage({
        investigation: completed({ status: 'cancelled' }),
        url: URL,
      })
    ).toBe(
      [
        '*Checkout latency spike* — Investigation was stopped before it completed.',
        `<${URL}|Open the investigation in Kibana>`,
      ].join('\n')
    );
  });
});

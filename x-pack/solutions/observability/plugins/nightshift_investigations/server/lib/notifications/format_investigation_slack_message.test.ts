/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildInvestigationSlackBlocks,
  buildInvestigationWorkObject,
  renderInvestigationSlackMessage,
  formatInvestigationSlackMessage,
} from './format_investigation_slack_message';
import type { NotifiableInvestigation } from './notification_delivery';

const URL = 'https://kibana.example.com/app/nightshift?investigationId=inv-1';

const completed = (overrides: Partial<NotifiableInvestigation> = {}): NotifiableInvestigation => ({
  investigation_id: 'inv-1',
  title: 'Checkout latency spike',
  severity: 'high',
  summary: 'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
  impact: {
    entities: [{ name: 'checkout' }, { name: 'payments-api' }],
  },
  recommendations: [
    { title: 'Roll back payments-api to v1.41' },
    { title: 'Raise the connection pool' },
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
    ['critical', 'Critical'],
    ['medium', 'Medium'],
    ['low', 'Low'],
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
        recommendations: [{ title: 'Restart <pod>' }],
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
        investigation: completed({ error: 'Agent timed out after 30m' }),
        phase: 'failed',
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

  it('posts a started announcement without findings', () => {
    const message = formatInvestigationSlackMessage({
      investigation: completed(),
      phase: 'started',
      url: URL,
      automationName: 'Alerts',
    });
    expect(message).toContain('Investigation started');
    expect(message).toContain('Automation: Alerts');
    expect(message).not.toContain('CPU was saturated');
  });

  it('bounds the entire message while preserving the locator link', () => {
    const message = formatInvestigationSlackMessage({
      investigation: completed({ title: '<'.repeat(512), summary: '&'.repeat(10000) }),
      phase: 'failed',
      reason: '<'.repeat(10000),
      url: URL,
    });
    expect(message.length).toBeLessThanOrEqual(4000);
    expect(message).toContain(`<${URL}|Open the investigation in Kibana>`);
  });
});

describe('buildInvestigationSlackBlocks', () => {
  const sectionTexts = (blocks: ReturnType<typeof buildInvestigationSlackBlocks>) =>
    blocks
      .filter(({ type }) => type === 'section')
      .map((block) => (block.text as { text: string }).text);

  it('lays out the impact, the quoted conclusion, the hypotheses, and the button', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({
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
        impact: { summary: 'Checkout errors for 12% of users.', entities: [{ name: 'checkout' }] },
      }),
      url: URL,
      automationName: 'Prod critical alerts',
    });

    expect(blocks.map(({ type }) => type)).toEqual([
      'section',
      'section',
      'divider',
      'section',
      'section',
      'section',
      'section',
      'actions',
    ]);
    expect(sectionTexts(blocks)).toEqual([
      '*Impact*',
      'Checkout errors for 12% of users.\n`checkout`',
      '*Conclusion*',
      '> Connection pool exhausted.\n> It started after the deploy.',
      '*Hypotheses*',
      '• *payments-api leaks connections* _(Confirmed · 86%)_: Pool hit its max at 14:03.',
    ]);
    expect(blocks[7]).toMatchObject({
      elements: [{ type: 'button', text: { text: 'View Full Investigation' }, url: URL }],
    });
    expect(JSON.stringify(blocks)).not.toContain('follow-up');
  });

  it('shows at most two confirmed hypotheses, most confident first', () => {
    const hypothesis = (candidate: string, confidence: number, status: string) => ({
      candidate,
      confidence,
      status,
    });
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({
        impact: undefined,
        summary: undefined,
        hypotheses: [
          hypothesis('A', 0.6, 'confirmed'),
          hypothesis('B', 0.9, 'confirmed'),
          hypothesis('C', 0.7, 'confirmed'),
          hypothesis('D', 0.95, 'investigating'),
        ],
      }),
      url: URL,
    });
    expect(sectionTexts(blocks)).toEqual([
      '*Hypotheses*',
      '• *B* _(Confirmed · 90%)_',
      '• *C* _(Confirmed · 70%)_',
    ]);
  });

  it('falls back to the leading open hypothesis and never shows dismissed ones', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({
        impact: undefined,
        summary: undefined,
        hypotheses: [
          { candidate: 'Gone', confidence: 0.99, status: 'dismissed' },
          { candidate: 'Maybe', confidence: 0.4, status: 'investigating' },
          { candidate: 'Less likely', confidence: 0.2, status: 'investigating' },
        ],
      }),
      url: URL,
    });
    expect(sectionTexts(blocks)).toEqual(['*Hypotheses*', '• *Maybe* _(Investigating · 40%)_']);
  });

  it('uses what happened as the impact when there is no impact summary', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({ impact: undefined }),
      url: URL,
    });
    expect(sectionTexts(blocks).slice(0, 2)).toEqual([
      '*Impact*',
      'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
    ]);
  });

  it('leaves out sections without data', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({ summary: undefined, impact: undefined }),
      url: URL,
    });
    expect(blocks.map(({ type }) => type)).toEqual(['actions']);
  });

  it('escapes mrkdwn control characters in agent-written text', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({ impact: undefined, verdict: 'Errors > 5% on <api> & co' }),
      url: URL,
    });
    expect(sectionTexts(blocks)[3]).toBe('> Errors &gt; 5% on &lt;api&gt; &amp; co');
  });

  it('keeps the started header within the 150 characters Slack allows', () => {
    const [headerBlock] = buildInvestigationSlackBlocks({
      investigation: completed({ title: 'x'.repeat(500) }),
      phase: 'started',
      url: URL,
    });
    expect((headerBlock.text as { text: string }).text.length).toBeLessThanOrEqual(150);
  });

  it('announces a started investigation without findings', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({ verdict: 'Not yet' }),
      phase: 'started',
      url: URL,
    });
    expect(blocks.map(({ type }) => type)).toEqual(['header', 'context', 'actions']);
    expect(JSON.stringify(blocks)).not.toContain('Not yet');
  });

  it('reports a failure with its reason', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed(),
      phase: 'failed',
      reason: 'Agent timed out',
      url: URL,
    });
    expect(JSON.stringify(blocks[1])).toContain(':warning: Investigation failed');
    expect(sectionTexts(blocks)).toEqual(['*What went wrong*', 'Agent timed out']);
  });

  it('falls back to a generic failure when the reason is blank', () => {
    const blocks = buildInvestigationSlackBlocks({
      investigation: completed({ error: '  ' }),
      phase: 'failed',
      reason: ' \n ',
      url: URL,
    });
    expect(sectionTexts(blocks)).toEqual(['*What went wrong*', 'Investigation failed']);
  });
});

describe('buildInvestigationWorkObject', () => {
  const entityOf = (params: Parameters<typeof buildInvestigationWorkObject>[0]) => {
    const [entity] = buildInvestigationWorkObject(params).entities as Array<{
      entity_type: string;
      url: string;
      external_ref: { id: string; type: string };
      entity_payload: {
        attributes: { title: { text: string }; display_type: string };
        fields: Record<string, { value: string }>;
        custom_fields?: Array<{ key: string; label: string; value: string; type: string }>;
      };
    }>;
    return entity;
  };

  it.each([
    {
      phase: 'started' as const,
      investigation: completed({ verdict: 'Not yet' }),
      reason: undefined,
      fields: { status: { value: 'Investigating' } },
      customFields: undefined,
    },
    {
      phase: 'completed' as const,
      investigation: completed({
        verdict: 'A bad deploy saturated the pool.',
        hypotheses: [
          { candidate: 'Pool exhaustion', confidence: 0.9, status: 'confirmed' },
          { candidate: 'DNS', confidence: 0.2, status: 'dismissed' },
        ],
      }),
      reason: undefined,
      fields: {
        status: { value: 'Completed' },
        description: { value: 'A bad deploy saturated the pool.' },
        service: { value: 'checkout' },
      },
      customFields: [
        {
          key: 'top_hypothesis',
          label: 'Top hypothesis',
          value: 'Confirmed · 90%',
          type: 'string',
        },
      ],
    },
    {
      phase: 'completed' as const,
      investigation: completed({ impact: { summary: 'Checkout is slow', entities: [] } }),
      reason: undefined,
      fields: { status: { value: 'Completed' }, description: { value: 'Checkout is slow' } },
      customFields: undefined,
    },
    {
      phase: 'failed' as const,
      investigation: completed(),
      reason: 'Agent timed out',
      fields: { status: { value: 'Failed' }, description: { value: 'Agent timed out' } },
      customFields: undefined,
    },
  ])('maps the $phase phase to the card fields', (testCase) => {
    const { phase, investigation, reason, fields, customFields } = testCase;
    const entity = entityOf({ investigation, url: URL, phase, reason });

    expect(entity.entity_type).toBe('slack#/entities/incident');
    expect(entity.url).toBe(URL);
    expect(entity.external_ref).toEqual({ id: 'inv-1', type: 'investigation' });
    expect(entity.entity_payload.attributes).toEqual({
      title: { text: 'Checkout latency spike' },
      display_type: 'Investigation',
    });
    expect(entity.entity_payload.fields).toEqual(fields);
    expect(entity.entity_payload.custom_fields).toEqual(customFields);
  });

  it('bounds the title and description', () => {
    const entity = entityOf({
      investigation: completed({ title: 'T'.repeat(500), verdict: 'v '.repeat(500) }),
      url: URL,
    });
    expect(entity.entity_payload.attributes.title.text).toHaveLength(150);
    expect(entity.entity_payload.fields.description.value.length).toBeLessThanOrEqual(120);
  });

  it('is part of the rendered message', () => {
    expect(
      renderInvestigationSlackMessage({ investigation: completed(), url: URL }).metadata
    ).toEqual(buildInvestigationWorkObject({ investigation: completed(), url: URL }));
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotifiableInvestigation } from './notification_delivery';
import { testIsomerRuntime as runtime } from './notification_routing.mock';
import { renderInvestigationSlackMessage } from './investigation_slack_composition';

const URL = 'https://kibana.example.com/app/nightshift?investigationId=inv-1';

const completed = (overrides: Partial<NotifiableInvestigation> = {}): NotifiableInvestigation => ({
  investigation_id: 'inv-1',
  title: 'Checkout latency spike',
  severity: 'high',
  summary: 'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
  verdict: 'Connection pool exhausted.\n\n- It started after the deploy.\n- Nothing was ruled out.',
  impact: { summary: 'Checkout errors for 12% of users.', entities: [{ name: 'checkout' }] },
  hypotheses: [
    {
      candidate: 'payments-api leaks connections',
      confidence: 0.86,
      status: 'confirmed',
      reason: '**Tested:** pool stats. **Result:** pool hit its max at 14:03.',
    },
  ],
  ...overrides,
});

const render = (
  params: Partial<Parameters<typeof renderInvestigationSlackMessage>[0]> = {}
): ReturnType<typeof renderInvestigationSlackMessage> =>
  renderInvestigationSlackMessage({ runtime, investigation: completed(), url: URL, ...params });

const sectionTitles = ({ blocks }: ReturnType<typeof render>): string[] =>
  blocks
    .filter(({ type }) => type === 'container')
    .map((block) => (block.title as { text: string }).text);

describe('renderInvestigationSlackMessage', () => {
  it('lays out what happened, the impact, the quoted conclusion, the hypotheses, and the button', () => {
    const message = render({ automationName: 'Prod critical alerts' });

    expect(message.blocks.map(({ type }) => type)).toEqual([
      'header',
      'context',
      'container',
      'container',
      'container',
      'container',
      'divider',
      'actions',
    ]);
    expect(sectionTitles(message)).toEqual([
      "What's happened",
      'Impact',
      'Conclusion',
      'Hypotheses',
    ]);
    expect(message.blocks[1]).toMatchObject({
      elements: [{ text: 'Severity: High  ·  Automation: Prod critical alerts' }],
    });
    expect(message.blocks.at(-1)).toMatchObject({
      elements: [{ type: 'button', text: { text: 'View Full Investigation' }, url: URL }],
    });
  });

  it('makes the detail collapsible and keeps the headline findings open', () => {
    const containers = render().blocks.filter(({ type }) => type === 'container');
    const collapsible = Object.fromEntries(
      containers.map((block) => [
        (block.title as { text: string }).text,
        block.is_collapsible === true,
      ])
    );

    expect(collapsible).toEqual({
      "What's happened": true,
      Impact: false,
      Conclusion: false,
      Hypotheses: true,
    });
  });

  it('quotes the conclusion and renders the hypothesis markdown instead of showing its syntax', () => {
    const { blocks, text } = render();
    const json = JSON.stringify(blocks);

    expect(json).toContain('rich_text_quote');
    expect(json).toContain('rich_text_list');
    expect(json).not.toContain('- It started');
    expect(json).toContain('"text":"Tested:","style":{"bold":true}');
    expect(json).not.toContain('**');
    expect(text).toContain('View Full Investigation: ' + URL);
  });

  it('shows at most two confirmed hypotheses, most confident first', () => {
    const hypothesis = (candidate: string, confidence: number, status: string) => ({
      candidate,
      confidence,
      status,
    });
    const { blocks } = render({
      investigation: completed({
        hypotheses: [
          hypothesis('A', 0.6, 'confirmed'),
          hypothesis('B', 0.9, 'confirmed'),
          hypothesis('C', 0.7, 'confirmed'),
          hypothesis('D', 0.95, 'investigating'),
        ],
      }),
    });
    const text = JSON.stringify(blocks);

    expect(text.indexOf('"B"')).toBeLessThan(text.indexOf('"C"'));
    expect(text).not.toContain('"A"');
    expect(text).not.toContain('"D"');
  });

  it('falls back to the leading open hypothesis and never shows dismissed ones', () => {
    const { text } = render({
      investigation: completed({
        hypotheses: [
          { candidate: 'Gone', confidence: 0.99, status: 'dismissed' },
          { candidate: 'Maybe', confidence: 0.4, status: 'investigating' },
          { candidate: 'Less likely', confidence: 0.2, status: 'investigating' },
        ],
      }),
    });

    expect(text).toContain('**Maybe** _(Investigating · 40%)_');
    expect(text).not.toContain('Gone');
    expect(text).not.toContain('Less likely');
  });

  it('caps the impact entities', () => {
    const entities = Array.from({ length: 8 }, (_, index) => ({ name: `svc-${index}` }));
    const { text } = render({
      investigation: completed({ impact: { entities } }),
    });

    expect(text).toContain('`svc-0`, `svc-1`, `svc-2`, `svc-3`, `svc-4` +3 more');
  });

  it('leaves out sections without data', () => {
    const message = render({
      investigation: completed({
        summary: undefined,
        impact: undefined,
        verdict: undefined,
        hypotheses: undefined,
        severity: undefined,
      }),
    });

    expect(message.blocks.map(({ type }) => type)).toEqual(['header', 'divider', 'actions']);
  });

  it('keeps a long title and long text within what the primitives accept', () => {
    const message = render({
      investigation: completed({
        title: 'x'.repeat(500),
        verdict: 'y'.repeat(10000),
        summary: 'z'.repeat(10000),
      }),
    });

    expect((message.blocks[0].text as { text: string }).text.length).toBeLessThanOrEqual(200);
    expect(message.blocks.length).toBeLessThanOrEqual(50);
  });

  it('clamps a long automation name instead of failing the render', () => {
    const { blocks } = render({ automationName: 'a'.repeat(1000), phase: 'started' });

    expect((blocks[1].elements as Array<{ text: string }>)[0].text.length).toBeLessThan(600);
  });

  it('announces a started investigation without findings', () => {
    const { blocks } = render({
      investigation: completed({ verdict: 'Not yet' }),
      phase: 'started',
      automationName: 'Alerts',
    });

    expect(blocks.map(({ type }) => type)).toEqual(['header', 'context', 'divider', 'actions']);
    expect(JSON.stringify(blocks)).toContain('Investigating…');
    expect(JSON.stringify(blocks)).toContain('Automation: Alerts');
    expect(JSON.stringify(blocks)).not.toContain('Not yet');
  });

  it('reports a failure with its reason', () => {
    const message = render({ phase: 'failed', reason: 'Agent timed out' });

    expect(JSON.stringify(message.blocks[1])).toContain(':warning: Investigation failed');
    expect(sectionTitles(message)).toEqual(['What went wrong']);
    expect(message.text).toContain('Agent timed out');
  });

  it('falls back to a generic failure when the reason is blank', () => {
    const message = render({
      investigation: completed({ error: '  ' }),
      phase: 'timed_out',
      reason: ' \n ',
    });

    expect(sectionTitles(message)).toEqual(['What went wrong']);
    expect(message.text).toContain('Investigation timed out');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotifiableInvestigation } from './notification_delivery';
import { testIsomerRuntime as runtime } from './notification_routing.mock';
import type { SlackBlock } from './investigation_slack_composition';
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

const isSpacer = (block: SlackBlock): boolean =>
  block.type === 'section' && (block.text as { text?: string } | undefined)?.text === ' ';

const FRAME_TYPES = ['header', 'context', 'container', 'divider', 'actions'];

const leadsOf = ({ blocks }: ReturnType<typeof render>): string =>
  JSON.stringify(blocks.filter((block) => !FRAME_TYPES.includes(block.type) && !isSpacer(block)));

const detailsOf = ({ blocks }: ReturnType<typeof render>): string =>
  JSON.stringify(blocks.find(({ type }) => type === 'container'));

describe('renderInvestigationSlackMessage', () => {
  it('shows a spaced lead sentence per finding, and the rest in one closed full-width card', () => {
    const message = render({ automationName: 'Prod critical alerts' });
    const { blocks } = message;
    const container = blocks.findIndex(({ type }) => type === 'container');

    expect(blocks.slice(0, 2).map(({ type }) => type)).toEqual(['header', 'context']);
    expect(blocks.slice(container).map(({ type }) => type)).toEqual([
      'container',
      'divider',
      'actions',
    ]);
    expect(blocks.slice(2, container).filter(isSpacer)).toHaveLength(2);
    expect(sectionTitles(message)).toEqual(['Investigation details']);
    expect(blocks[container]).toMatchObject({
      is_collapsible: true,
      default_collapsed: true,
      width: 'full',
    });
    expect(blocks[1]).toMatchObject({
      elements: [{ text: 'Severity: High  ·  Automation: Prod critical alerts' }],
    });
    expect(blocks.at(-1)).toMatchObject({
      elements: [{ type: 'button', text: { text: 'View Full Investigation' }, url: URL }],
    });
    const leads = leadsOf(message);
    expect(leads.indexOf('What happened')).toBeLessThan(leads.indexOf('Impact'));
    expect(leads.indexOf('Impact')).toBeLessThan(leads.indexOf('Conclusion'));
    expect(leads).toContain('Connection pool exhausted.');
    expect(leads).not.toContain('It started after the deploy');
    expect(detailsOf(message)).toContain('It started after the deploy');
  });

  it('keeps only the first sentence of a finding visible, stripping any list marker first', () => {
    const summary = '1. The pool saturated. '.concat('The pool saturated. '.repeat(39)).trim();
    const message = render({ investigation: completed({ summary }) });
    const leads = leadsOf(message);

    expect(leads).not.toContain('"1."');
    expect(leads.match(/The pool saturated\./g)).toHaveLength(1);
    expect(detailsOf(message)).toContain('The pool saturated.');
  });

  it('does not repeat a lead that another finding already states', () => {
    const message = render({
      investigation: completed({
        summary: 'Connection pool exhausted.',
        verdict: 'Connection pool exhausted. More detail follows.',
      }),
    });

    expect(leadsOf(message).match(/Connection pool exhausted\./g)).toHaveLength(1);
    expect(detailsOf(message)).toContain('More detail follows.');
  });

  it('quotes the conclusion lead, keeps a conclusion list together, and renders markdown in leads and details', () => {
    const message = render({
      investigation: completed({
        verdict:
          'Connection pool exhausted.\n\n- **Tested:** pool stats.\n- Nothing was ruled out.',
      }),
    });
    const { blocks, text } = message;
    const json = JSON.stringify(blocks);

    expect(leadsOf(message)).toContain('rich_text_quote');
    expect(detailsOf(message)).not.toContain('rich_text_quote');
    expect(json).toContain('rich_text_list');
    expect(json).toContain('"text":"Tested:","style":{"bold":true}');
    expect(json).not.toContain('- **Tested');
    expect(json).not.toContain('**');
    expect(text).toContain('View Full Investigation: ' + URL);
  });

  it('shows each hypothesis with its result under it, without how it was tested', () => {
    const message = render({
      investigation: completed({
        hypotheses: [
          {
            candidate: 'payments-api leaks connections',
            confidence: 0.86,
            status: 'confirmed',
            reason: '**Tested:** pool stats. **Result:** pool hit its max at 14:03.',
          },
          {
            candidate: 'Inline bold colon',
            confidence: 0.6,
            status: 'confirmed',
            reason: '**Result:** **payments-api**: the pool reached 100 connections.',
          },
          {
            candidate: 'Plain',
            confidence: 0.5,
            status: 'confirmed',
            reason: '**Tested:** pool stats.\nNo marker here.',
          },
        ],
      }),
    });
    const details = detailsOf(message);

    expect(details).toContain('payments-api leaks connections');
    expect(details).toContain('Confirmed · 86%');
    expect(details).toContain('pool hit its max at 14:03.');
    expect(details).not.toContain('pool stats');
    expect(details).toContain('the pool reached 100 connections.');
    expect(details).toContain('No marker here.');
    expect(details.match(/"text":"Result:"/g)).toHaveLength(2);
    expect(details).not.toContain('"type":"table"');
  });

  it('shows at most three confirmed hypotheses, most confident first', () => {
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
          hypothesis('E', 0.5, 'confirmed'),
          hypothesis('D', 0.95, 'investigating'),
        ],
      }),
    });
    const text = JSON.stringify(blocks);

    expect(text.indexOf('"B"')).toBeLessThan(text.indexOf('"C"'));
    expect(text.indexOf('"C"')).toBeLessThan(text.indexOf('"A"'));
    expect(text).not.toContain('"E"');
    expect(text).not.toContain('"D"');
  });

  it('falls back to the leading open hypothesis and never shows dismissed ones', () => {
    const { blocks } = render({
      investigation: completed({
        hypotheses: [
          { candidate: 'Gone', confidence: 0.99, status: 'dismissed' },
          { candidate: 'Maybe', confidence: 0.4, status: 'investigating' },
          { candidate: 'Less likely', confidence: 0.2, status: 'investigating' },
        ],
      }),
    });

    const json = JSON.stringify(blocks);

    expect(json).toContain('Maybe');
    expect(json).toContain('Investigating · 40%');
    expect(json).not.toContain('Gone');
    expect(json).not.toContain('Less likely');
  });

  it('keeps the affected entities when the impact text is long', () => {
    const summary = `Checkout failed. ${'Orders were rejected after the deploy. '.repeat(60)}`;
    const message = render({
      investigation: completed({ impact: { summary, entities: [{ name: 'checkout' }] } }),
    });

    expect(detailsOf(message)).toContain('checkout');
    expect(detailsOf(message)).toContain('Affected');
  });

  it('caps the impact entities', () => {
    const entities = Array.from({ length: 8 }, (_, index) => ({ name: `svc-${index}` }));
    const json = JSON.stringify(
      render({ investigation: completed({ impact: { entities } }) }).blocks
    );

    expect(json).toContain('svc-4');
    expect(json).not.toContain('svc-5');
    expect(json).toContain('+3 more');
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

  it('clamps overlong inputs and keeps the fallback text under the Slack limit', () => {
    const long = 'w'.repeat(1500);
    const { blocks, text } = render({
      automationName: 'a'.repeat(1000),
      investigation: completed({
        title: 'x'.repeat(500),
        summary: long,
        verdict: long,
        impact: { summary: long, entities: [{ name: 'checkout' }] },
        hypotheses: [0, 1, 2, 3].map((index) => ({
          candidate: `candidate ${index}`,
          confidence: 0.9,
          status: 'confirmed' as const,
          reason: 'r'.repeat(600),
        })),
      }),
    });

    expect((blocks[0].text as { text: string }).text.length).toBeLessThanOrEqual(200);
    expect((blocks[1].elements as Array<{ text: string }>)[0].text.length).toBeLessThan(600);
    expect(blocks.length).toBeLessThanOrEqual(50);
    expect(text.length).toBeLessThanOrEqual(4000);
  });

  it('does not let agent text broadcast or link through Slack control sequences', () => {
    const hostile = '<!channel> <!here> <https://evil.example|click> &amp;';
    const { blocks, text } = render({
      automationName: hostile,
      investigation: completed({
        title: hostile,
        summary: hostile,
        verdict: hostile,
        impact: { summary: hostile, entities: [{ name: hostile }] },
        hypotheses: [{ candidate: hostile, confidence: 0.9, status: 'confirmed', reason: hostile }],
      }),
    });
    // Only mrkdwn parses control sequences; plain_text and rich_text elements are literal.
    const mrkdwn = JSON.stringify(blocks).match(/"type":"mrkdwn","text":"[^"]*"/g) ?? [];

    expect(mrkdwn.length).toBeGreaterThan(0);
    for (const rendered of [...mrkdwn, text]) {
      expect(rendered).not.toContain('<!channel>');
      expect(rendered).not.toContain('<!here>');
      expect(rendered).not.toContain('<https://evil.example|click>');
    }
    expect(text).toContain('&lt;!channel&gt;');
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

  it.each([
    { phase: 'failed' as const, reason: 'Agent timed out', expected: 'Agent timed out' },
    { phase: 'timed_out' as const, reason: ' \n ', expected: 'Investigation timed out' },
  ])('reports $phase outcome', ({ phase, reason, expected }) => {
    const message = render({
      investigation: completed({ error: '  ' }),
      phase,
      reason,
    });

    expect(JSON.stringify(message.blocks[1])).toContain('⚠️');
    expect(sectionTitles(message)).toEqual(['What went wrong']);
    expect(message.text).toContain(expected);
  });
});

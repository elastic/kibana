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

/** The visible lead blocks, without the spacers between them. */
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
    expect(blocks[container]).toMatchObject({ is_collapsible: true, width: 'full' });
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

  it('keeps only the first sentence of a finding visible', () => {
    const summary = 'The pool saturated. '.repeat(40).trim();
    const message = render({ investigation: completed({ summary }) });

    expect(leadsOf(message).match(/The pool saturated\./g)).toHaveLength(1);
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

  it('quotes the conclusion lead, keeps a conclusion list together, and renders markdown instead of its syntax', () => {
    const message = render();
    const { blocks, text } = message;
    const json = JSON.stringify(blocks);

    expect(leadsOf(message)).toContain('rich_text_quote');
    expect(detailsOf(message)).not.toContain('rich_text_quote');
    expect(json).toContain('rich_text_list');
    expect(json).not.toContain('- It started');
    expect(json).not.toContain('**');
    expect(text).toContain('View Full Investigation: ' + URL);
  });

  it('renders markdown in the details instead of its syntax', () => {
    const { blocks } = render({
      investigation: completed({ verdict: 'Pool exhausted.\n\n**Tested:** pool stats.' }),
    });

    expect(JSON.stringify(blocks)).toContain('"text":"Tested:","style":{"bold":true}');
    expect(JSON.stringify(blocks)).not.toContain('**Tested');
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
            candidate: 'Inline',
            confidence: 0.6,
            status: 'confirmed',
            reason: '**Result:** the **payments-api** leaks connections.',
          },
          { candidate: 'Plain', confidence: 0.5, status: 'confirmed', reason: 'No marker here.' },
        ],
      }),
    });
    const details = detailsOf(message);

    expect(details).toContain('payments-api leaks connections');
    expect(details).toContain('Confirmed · 86%');
    expect(details).toContain('pool hit its max at 14:03.');
    expect(details).not.toContain('pool stats');
    expect(details).toContain('No marker here.');
    expect(details).toContain('leaks connections.');
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

  it('keeps the fallback text under the Slack text limit with maximum-length findings', () => {
    const long = 'w'.repeat(1500);
    const { text } = render({
      investigation: completed({
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

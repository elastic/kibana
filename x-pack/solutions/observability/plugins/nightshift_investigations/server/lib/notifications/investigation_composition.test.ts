/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@kbn/isomer';
import type { SectionNode } from '@kbn/isomer-components';
import type { InvestigationMessageParams } from './investigation_composition';
import { buildInvestigationComposition } from './investigation_composition';
import type { NotifiableInvestigation } from './notification_delivery';

const URL = 'https://kibana.example.com/app/nightshift?investigationId=inv-1';

const completed = (overrides: Partial<NotifiableInvestigation> = {}): NotifiableInvestigation => ({
  investigation_id: 'inv-1',
  title: 'Checkout latency spike',
  severity: 'high',
  summary: 'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
  impact: { entities: [{ name: 'checkout' }, { name: 'payments-api' }] },
  ...overrides,
});

const build = (params: Partial<InvestigationMessageParams> = {}) =>
  buildInvestigationComposition({ investigation: completed(), url: URL, ...params });

type Body = Composition['body'];

const nodeTypes = (body: Body) => body.map(({ type }) => type);

const textOf = (node: Body[number] | undefined): string =>
  node && 'text' in node && typeof node.text === 'string' ? node.text : '';

const sections = (body: Body) =>
  body.filter((node): node is SectionNode => node.type === 'section');

const sectionText = (body: Body, title: string) =>
  sections(body)
    .find((node) => node.title === title)
    ?.body.map(textOf);

const hypothesis = (candidate: string, confidence: number, status: string, reason?: string) => ({
  candidate,
  confidence,
  status,
  ...(reason ? { reason } : {}),
});

describe('buildInvestigationComposition', () => {
  it('announces a started investigation without findings', () => {
    const { body } = build({
      investigation: completed({ verdict: 'Not yet' }),
      phase: 'started',
      automationName: 'Prod critical alerts',
    });
    expect(nodeTypes(body)).toEqual(['header', 'context', 'actions']);
    expect(body[1]).toEqual({
      type: 'context',
      items: [{ text: '⏳ Investigating…' }, { text: 'Automation: Prod critical alerts' }],
    });
    expect(JSON.stringify(body)).not.toContain('Not yet');
  });

  it('reports a failure with its reason, or a generic one when it is blank', () => {
    const failed = build({ phase: 'failed', reason: 'Agent timed out' }).body;
    expect(nodeTypes(failed)).toEqual(['header', 'context', 'section', 'actions']);
    expect(failed[1]).toEqual({ type: 'context', items: [{ text: '⚠️ Investigation failed' }] });
    expect(sectionText(failed, 'What went wrong')).toEqual(['Agent timed out']);

    const blank = build({
      investigation: completed({ error: '  ' }),
      phase: 'failed',
      reason: ' \n ',
    }).body;
    expect(sectionText(blank, 'What went wrong')).toEqual(['Investigation failed']);

    const stored = build({ investigation: completed({ error: 'Sandbox lost' }), phase: 'failed' });
    expect(sectionText(stored.body, 'What went wrong')).toEqual(['Sandbox lost']);
  });

  it('lays out the impact, the conclusion, the hypotheses, and the button', () => {
    const { body } = build({
      investigation: completed({
        verdict: 'Connection pool exhausted.\nIt started after the deploy.',
        hypotheses: [
          hypothesis('Bad DNS', 0.1, 'dismissed', 'Lookups fine.'),
          hypothesis('payments-api leaks connections', 0.86, 'confirmed', 'Pool at max, 14:03.'),
          hypothesis('Noisy neighbour', 0.3, 'investigating'),
        ],
        impact: { summary: 'Checkout errors for 12% of users.', entities: [{ name: 'checkout' }] },
      }),
    });
    expect(nodeTypes(body)).toEqual([
      'header',
      'section',
      'divider',
      'section',
      'section',
      'actions',
    ]);
    expect(sections(body).map(({ title }) => title)).toEqual([
      'Impact',
      'Conclusion',
      'Hypotheses',
    ]);
    expect(sectionText(body, 'Impact')).toEqual([
      'Checkout errors for 12% of users.',
      '`checkout`',
    ]);
    expect(sections(body)[1].body).toEqual([
      { type: 'quote', text: 'Connection pool exhausted.\nIt started after the deploy.' },
    ]);
    expect(sectionText(body, 'Hypotheses')).toEqual([
      '- **payments-api leaks connections** _(Confirmed · 86%)_: Pool at max, 14:03.',
    ]);
    expect(body.at(-1)).toEqual({
      type: 'actions',
      buttons: [{ label: 'View Full Investigation', url: URL, primary: true }],
    });
  });

  it('keeps the completed title off Slack, where the message edits the started one', () => {
    expect(build().body[0]).toEqual({
      type: 'header',
      text: 'Checkout latency spike',
      surfaces: ['react', 'snapshot', 'text', 'markdown'],
    });
    expect(build({ phase: 'started' }).body[0]).not.toHaveProperty('surfaces');
  });

  it('shows at most two confirmed hypotheses, most confident first', () => {
    const { body } = build({
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
    });
    expect(sectionText(body, 'Hypotheses')).toEqual([
      '- **B** _(Confirmed · 90%)_\n- **C** _(Confirmed · 70%)_',
    ]);
  });

  it('falls back to the leading open hypothesis and never shows dismissed ones', () => {
    const { body } = build({
      investigation: completed({
        impact: undefined,
        summary: undefined,
        hypotheses: [
          hypothesis('Gone', 0.99, 'dismissed'),
          hypothesis('Maybe', 0.4, 'investigating'),
          hypothesis('Less likely', 0.2, 'investigating'),
        ],
      }),
    });
    expect(sectionText(body, 'Hypotheses')).toEqual(['- **Maybe** _(Investigating · 40%)_']);
  });

  it('uses what happened as the impact when there is no impact summary', () => {
    const { body } = build({ investigation: completed({ impact: undefined }) });
    expect(sectionText(body, 'Impact')).toEqual([
      'p99 latency on checkout rose after the 14:02 deploy of payments-api.',
    ]);
  });

  it('caps the impacted entities at five and counts the rest', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const { body } = build({
      investigation: completed({
        summary: undefined,
        impact: { entities: names.map((name) => ({ name })) },
      }),
    });
    expect(sectionText(body, 'Impact')).toEqual(['`a`, `b`, `c`, `d`, `e` +2 more']);
  });

  it('leaves out sections without data', () => {
    const { body } = build({ investigation: completed({ summary: undefined, impact: undefined }) });
    expect(nodeTypes(body)).toEqual(['header', 'actions']);
  });

  it('truncates long text with an ellipsis', () => {
    const { body } = build({
      investigation: completed({
        title: 'x'.repeat(500),
        summary: 's'.repeat(2000),
        impact: undefined,
        verdict: 'v'.repeat(2000),
        hypotheses: [hypothesis('H', 0.9, 'confirmed', 'r'.repeat(1000))],
      }),
      automationName: 'a'.repeat(1000),
      phase: 'completed',
    });
    expect(textOf(body[0])).toHaveLength(150);
    expect(textOf(body[0]).endsWith('…')).toBe(true);
    const [impact] = sectionText(body, 'Impact') ?? [];
    expect(impact).toHaveLength(1500);
    const [verdict] = sectionText(body, 'Conclusion') ?? [];
    expect(verdict).toHaveLength(1500);
    const [hypotheses] = sectionText(body, 'Hypotheses') ?? [];
    expect(hypotheses).toContain(`: ${'r'.repeat(599)}…`);

    const [, context] = build({ phase: 'started', automationName: 'a'.repeat(1000) }).body;
    expect(context).toMatchObject({ items: [{}, { text: expect.stringMatching(/^.{500}$/u) }] });
  });

  it('escapes Markdown in names so they cannot format, link, or break the list', () => {
    const { body } = build({
      investigation: completed({
        summary: undefined,
        impact: { entities: [{ name: 'a`b' }] },
        hypotheses: [
          hypothesis('*bold* [x](https://evil.example)', 0.9, 'confirmed', '- not\n- a list'),
        ],
      }),
    });
    const [entities] = sectionText(body, 'Impact') ?? [];
    expect(entities).toBe('``a`b``');
    const [hypotheses] = sectionText(body, 'Hypotheses') ?? [];
    expect(hypotheses).toBe(
      '- **\\*bold\\* \\[x]\\(https\\://evil.example)** _(Confirmed · 90%)_: - not - a list'
    );
  });

  it('leaves out the button when the URL is not one Slack can open', () => {
    expect(nodeTypes(build({ url: '/app/nightshift' }).body)).not.toContain('actions');
    expect(nodeTypes(build({ url: 'ftp://kibana.example.com/inv-1' }).body)).not.toContain(
      'actions'
    );
  });
});

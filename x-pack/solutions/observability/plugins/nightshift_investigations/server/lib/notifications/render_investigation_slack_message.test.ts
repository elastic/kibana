/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaIsomerRuntime } from '@kbn/isomer';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import type { SlackBlock } from './render_investigation_slack_message';
import { renderInvestigationSlackMessage } from './render_investigation_slack_message';
import type { ParityCaseName } from './__fixtures__/legacy_investigation_slack_messages';
import {
  LEGACY_SLACK_MESSAGES,
  PARITY_CASES,
} from './__fixtures__/legacy_investigation_slack_messages';
import type { NotifiableInvestigation } from './notification_delivery';

type Role = 'title' | 'fact' | 'label' | 'body' | 'quote' | 'link';
interface ContentItem {
  role: Role;
  text: string;
}

/** Block Kit as loose JSON, so one walker reads both the legacy and the new blocks. */
interface LooseBlock {
  type: string;
  text?: { text: string };
  title?: { text: string };
  elements?: LooseBlock[];
  child_blocks?: LooseBlock[];
  url?: string;
}

const unescapeMrkdwn = (value: string) =>
  value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The legacy shortcodes, which Isomer's plain-text `context` writes as Unicode emoji. */
const SHORTCODES: Record<string, string> = {
  ':hourglass_flowing_sand:': '⏳',
  ':warning:': '⚠️',
};

/** Legacy mrkdwn decoration around the words: bold, italics, code, bullets, quote marks. */
const plainMrkdwn = (value: string) =>
  unescapeMrkdwn(value.replace(/^• /, '').replace(/^> ?/, '').replace(/[*_`]/g, ''));

const richText = (element: LooseBlock): string =>
  element.elements
    ?.map((child) => (child.elements ? richText(child) : child.text ?? ''))
    .join('') ?? '';

const contentOf = (block: LooseBlock): ContentItem[] => {
  switch (block.type) {
    case 'header':
      return [{ role: 'title', text: block.text?.text ?? '' }];
    case 'context':
      return (block.elements ?? []).flatMap(({ text = '' }) =>
        String(text)
          .split('  ·  ')
          .map((fact) => ({
            role: 'fact' as const,
            text: unescapeMrkdwn(fact.replace(/^:[a-z_]+:/, (code) => SHORTCODES[code] ?? code)),
          }))
      );
    case 'section': {
      const text = block.text?.text ?? '';
      const label = /^\*([^*]+)\*$/.exec(text);
      if (label) {
        return [{ role: 'label', text: label[1] }];
      }
      const role = text.startsWith('>') ? 'quote' : 'body';
      return text.split('\n').map((line) => ({ role, text: plainMrkdwn(line) }));
    }
    case 'container':
      return [
        { role: 'label', text: block.title?.text ?? '' },
        ...(block.child_blocks ?? []).flatMap(contentOf),
      ];
    case 'rich_text':
      return (block.elements ?? []).flatMap((element): ContentItem[] => {
        if (element.type === 'rich_text_quote') {
          return richText(element)
            .split('\n')
            .map((line) => ({ role: 'quote' as const, text: line }));
        }
        if (element.type === 'rich_text_list') {
          return (element.elements ?? []).map((item) => ({
            role: 'body' as const,
            text: richText(item),
          }));
        }
        return [{ role: 'body' as const, text: richText(element) }];
      });
    case 'actions':
      return (block.elements ?? []).map(({ text, url }) => ({
        role: 'link' as const,
        text: `${text?.text} → ${url}`,
      }));
    default:
      return [];
  }
};

/** What a message says, in order, with Block Kit layout and mrkdwn decoration removed. */
const slackContent = (blocks: readonly SlackBlock[] | ReadonlyArray<Record<string, unknown>>) =>
  (blocks as unknown as LooseBlock[]).flatMap(contentOf);

const blockTypes = (blocks: readonly SlackBlock[]) => blocks.map(({ type }) => type);

let runtime: KibanaIsomerRuntime;

beforeAll(async () => {
  runtime = await isomerPluginMock.createStartContract().getRuntime();
});

const render = (name: ParityCaseName) =>
  renderInvestigationSlackMessage(
    runtime,
    PARITY_CASES.find((parityCase) => parityCase.name === name)!.params
  );

describe('renderInvestigationSlackMessage', () => {
  describe('parity with the hand-built blocks it replaced', () => {
    it.each(PARITY_CASES.map(({ name }) => name))('says the same as before: %s', (name) => {
      expect(slackContent(render(name).blocks)).toEqual(
        slackContent(LEGACY_SLACK_MESSAGES[name].blocks)
      );
    });

    // Layout changes are deliberate: labels are containers, Markdown is rich text, and Isomer's
    // Slack envelope sets the button apart with a divider.
    it.each<[ParityCaseName, string[]]>([
      ['started', ['header', 'context', 'divider', 'actions']],
      ['failed', ['header', 'context', 'container', 'divider', 'actions']],
      ['failed_blank', ['header', 'context', 'container', 'divider', 'actions']],
      ['completed', ['container', 'divider', 'container', 'container', 'divider', 'actions']],
      ['completed_hypotheses_only', ['container', 'divider', 'actions']],
      ['completed_empty', ['actions']],
    ])('lays out %s as %j', (name, types) => {
      expect(blockTypes(render(name).blocks)).toEqual(types);
    });

    it('keeps the header, context, and button blocks as they were', () => {
      const legacy = LEGACY_SLACK_MESSAGES.started.blocks;
      const { blocks } = render('started');
      expect(blocks[0]).toEqual(legacy[0]);
      expect(blocks[3]).toEqual(legacy[2]);
      expect(blocks[1]).toEqual({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '⏳ Investigating…  ·  Automation: Prod critical alerts' },
        ],
      });
    });
  });

  describe('fallback text', () => {
    it('is the message as plain text, titled, ending with the link', () => {
      expect(render('started').text).toBe(
        [
          'Checkout latency spike',
          '⏳ Investigating… · Automation: Prod critical alerts',
          'View Full Investigation: https://kibana.example.com/app/nightshift?investigationId=inv-1',
        ].join('\n\n')
      );
      expect(render('failed').text).toContain('What went wrong\n\nAgent timed out');
    });

    it('titles the completed message and carries what its blocks show', () => {
      const { text } = render('completed');
      expect(text.startsWith('Checkout latency spike\n\nImpact\n\nCheckout errors')).toBe(true);
      expect(text).toContain('payments-api leaks connections');
      expect(text).toContain('&gt; Connection pool exhausted.');
    });

    // The legacy fallback was written separately from the blocks; now it says what they say.
    it('no longer carries what the blocks never showed', () => {
      expect(LEGACY_SLACK_MESSAGES.completed.text).toContain('Severity: High');
      expect(LEGACY_SLACK_MESSAGES.completed.text).toContain('Proposed action:');
      const { text } = render('completed');
      expect(text).not.toContain('Severity');
      expect(text).not.toContain('Proposed action');
    });
  });

  describe('escaping and limits', () => {
    const hostile: NotifiableInvestigation = {
      investigation_id: 'inv-1',
      title: 'Errors > 5% on <api> & co',
      summary: 'See <https://evil.example|here> & <!channel>',
      verdict: 'Errors > 5% on <api> & co',
      hypotheses: [
        { candidate: '<!here> <https://evil.example|x>', confidence: 1, status: 'confirmed' },
      ],
    };
    const url = 'https://kibana.example.com/app/nightshift?investigationId=inv-1';

    it.each(['started', 'failed', 'completed'] as const)(
      'never lets agent text form a Slack link or mention: %s',
      (phase) => {
        const { text, blocks } = renderInvestigationSlackMessage(runtime, {
          investigation: hostile,
          url,
          phase,
          reason: '<!channel> failed',
          automationName: '<@U123>',
        });
        const mrkdwn = JSON.stringify(blocks)
          .match(/"type":"mrkdwn","text":"[^"]*"/g)
          ?.join('');
        expect(mrkdwn ?? '').not.toMatch(/<[!@#]|<https?:/);
        expect(text).not.toMatch(/<[!@#]|<https?:/);
        expect(JSON.stringify(blocks)).not.toContain('"type":"link"');
      }
    );

    it('keeps raw text in rich text, which Slack does not parse', () => {
      const { blocks } = renderInvestigationSlackMessage(runtime, { investigation: hostile, url });
      expect(JSON.stringify(blocks)).toContain('"text":"Errors > 5% on <api> & co"');
    });

    it('keeps every block and the text within Slack limits', () => {
      const long = 'x'.repeat(5000);
      const { text, blocks } = renderInvestigationSlackMessage(runtime, {
        investigation: { ...hostile, title: long, summary: long, verdict: long },
        url,
        phase: 'failed',
        reason: long,
        automationName: long,
      });
      const [header, context] = blocks as unknown as LooseBlock[];
      expect(header.text?.text.length).toBeLessThanOrEqual(150);
      expect(JSON.stringify(context).length).toBeLessThan(2100);
      expect(text.length).toBeLessThanOrEqual(4000);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SURFACE_NAMES, navigationHref } from '@elastic/isomer-sdk';
import { md, serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS, slackLinkUrl } from '@elastic/isomer-sdk/slack';
import type { Composition } from '@kbn/isomer';
import type {
  ActionsNode,
  ContextNode,
  DividerNode,
  HeaderNode,
  MarkdownNode,
  QuoteNode,
  SectionNode,
} from '@kbn/isomer-components';
import type { NotificationPhase } from './notification_routing';
import type { NotifiableInvestigation } from './notification_delivery';

export interface InvestigationMessageParams {
  investigation: NotifiableInvestigation;
  url: string;
  automationName?: string;
  phase?: NotificationPhase;
  reason?: string;
}

type InvestigationNode =
  | ActionsNode
  | ContextNode
  | DividerNode
  | HeaderNode
  | MarkdownNode
  | QuoteNode
  | SectionNode;

/** Slack truncates long messages; a channel post is a pointer, the detail lives in Kibana. */
const MAX_SUMMARY_LENGTH = 1500;
const MAX_IMPACT_ENTITIES = 5;
const MAX_HYPOTHESES = 2;
const MAX_HYPOTHESIS_REASON_LENGTH = 600;
/** Slack's header limit, below the `header` primitive's own. */
const MAX_TITLE_LENGTH = SLACK_LIMITS.headerTextChars;
/** The `context` primitive's limit for one item. */
const MAX_CONTEXT_ITEM_LENGTH = 500;

const linkUrlSchema = navigationHref({ max: SLACK_LIMITS.urlChars });

/** Every surface but Slack's blocks; Slack's fallback text is the `text` surface. */
const OFF_SLACK = SURFACE_NAMES.filter((surface) => surface !== 'slack');

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** Agent-written prose, which Slack showed as mrkdwn before Isomer and now reads as Markdown. */
const prose = (text: string): MarkdownNode => ({ type: 'markdown', text });

/** Text built with `md`, which escapes every value it's given. */
const built = (...content: Parameters<typeof serializeMarkdown>): MarkdownNode => ({
  type: 'markdown',
  text: serializeMarkdown(...content),
});

const quote = (text: string): QuoteNode => ({ type: 'quote', text });

const section = (title: string, body: SectionNode['body']): SectionNode => ({
  type: 'section',
  title,
  body,
});

const contextLine = (items: string[]): ContextNode => ({
  type: 'context',
  items: items
    .filter(Boolean)
    .map((text) => ({ text: truncate(oneLine(text), MAX_CONTEXT_ITEM_LENGTH) })),
});

/** The link back to Kibana, left out when Slack couldn't open the URL. */
const linkButton = (url: string): ActionsNode[] =>
  linkUrlSchema.safeParse(url).success && slackLinkUrl(url)
    ? [
        {
          type: 'actions',
          buttons: [{ label: 'View Full Investigation', url, primary: true }],
        },
      ]
    : [];

const impactSection = (investigation: NotifiableInvestigation): SectionNode[] => {
  const entityNames = (investigation.impact?.entities ?? [])
    .map(({ name }) => oneLine(name))
    .filter(Boolean);
  const shownEntities = entityNames.slice(0, MAX_IMPACT_ENTITIES);
  const hiddenEntities = entityNames.length - shownEntities.length;
  // Without an impact summary, what happened stands in for it.
  const impactText = investigation.impact?.summary?.trim() || investigation.summary?.trim();
  const body: MarkdownNode[] = [
    ...(impactText ? [prose(truncate(impactText, MAX_SUMMARY_LENGTH))] : []),
    ...(shownEntities.length > 0
      ? [
          built(
            md.paragraph(
              ...shownEntities.flatMap((name, index) => [
                ...(index > 0 ? [', '] : []),
                md.code(name),
              ]),
              ...(hiddenEntities > 0 ? [` +${hiddenEntities} more`] : [])
            )
          ),
        ]
      : []),
  ];
  return body.length > 0 ? [section('Impact', body)] : [];
};

const conclusionSection = (investigation: NotifiableInvestigation): SectionNode[] => {
  const verdict = investigation.verdict?.trim();
  return verdict ? [section('Conclusion', [quote(truncate(verdict, MAX_SUMMARY_LENGTH))])] : [];
};

const hypothesesSection = (investigation: NotifiableInvestigation): SectionNode[] => {
  // Dismissed hypotheses are not findings. Without a confirmed one, the leading open one stands in.
  const byConfidence = [...(investigation.hypotheses ?? [])].sort(
    (a, b) => b.confidence - a.confidence
  );
  const confirmed = byConfidence.filter(({ status }) => status === 'confirmed');
  const hypotheses =
    confirmed.length > 0
      ? confirmed.slice(0, MAX_HYPOTHESES)
      : byConfidence.filter(({ status }) => status === 'investigating').slice(0, 1);
  if (hypotheses.length === 0) {
    return [];
  }
  return [
    section('Hypotheses', [
      built(
        md.list(
          hypotheses.map(({ candidate, confidence, status, reason }) =>
            md.paragraph(
              md.strong(oneLine(candidate)),
              ' ',
              md.emphasis(`(${capitalize(status)} · ${Math.round(confidence * 100)}%)`),
              ...(reason?.trim()
                ? [`: ${truncate(oneLine(reason), MAX_HYPOTHESIS_REASON_LENGTH)}`]
                : [])
            )
          )
        )
      ),
    ]),
  ];
};

/**
 * One investigation lifecycle message as an Isomer composition: the investigation's title, then a
 * started or failed notice, or the completed outcome (impact, the quoted conclusion, the
 * hypotheses), and a button back to Kibana. The completed message edits the started one in place,
 * so its title stays out of Slack's blocks and only names the message in its fallback text.
 */
export const buildInvestigationComposition = ({
  investigation,
  url,
  automationName,
  phase = 'completed',
  reason,
}: InvestigationMessageParams): Composition => {
  const title: HeaderNode = {
    type: 'header',
    text: truncate(oneLine(investigation.title) || 'Investigation', MAX_TITLE_LENGTH),
    ...(phase === 'completed' ? { surfaces: OFF_SLACK } : {}),
  };
  const automation = automationName ? `Automation: ${automationName}` : '';
  let body: InvestigationNode[];

  if (phase === 'started') {
    body = [title, contextLine(['⏳ Investigating…', automation]), ...linkButton(url)];
  } else if (phase === 'failed') {
    const failureReason = reason?.trim() || investigation.error?.trim() || 'Investigation failed';
    body = [
      title,
      contextLine(['⚠️ Investigation failed', automation]),
      section('What went wrong', [
        built(md.paragraph(truncate(failureReason, MAX_SUMMARY_LENGTH))),
      ]),
      ...linkButton(url),
    ];
  } else {
    const impact = impactSection(investigation);
    body = [
      title,
      ...impact,
      ...(impact.length > 0 ? [{ type: 'divider' } as const] : []),
      ...conclusionSection(investigation),
      ...hypothesesSection(investigation),
      ...linkButton(url),
    ];
  }

  return { type: 'view', body };
};

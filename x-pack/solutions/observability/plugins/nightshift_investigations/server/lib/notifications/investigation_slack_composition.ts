/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ComponentsNode } from '@kbn/isomer-components';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';
import type { JsonObject } from '@kbn/utility-types';
import type { Severity } from '@kbn/significant-events-schema';
import type { NotificationPhase } from './notification_routing';
import type { NotifiableInvestigation } from './notification_delivery';

export type SlackBlock = JsonObject & { type: string };

const MAX_HEADER_LENGTH = 200;
const MAX_CONTEXT_ITEM_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 1500;
const MAX_LEAD_LENGTH = 200;
const MAX_DETAIL_LENGTH = 800;
const MAX_CANDIDATE_LENGTH = 200;
const MAX_RESULT_LENGTH = 300;
const MAX_AFFECTED = 5;
const MAX_HYPOTHESES = 3;

// The only severity label map lives in the nightshift public plugin, which the server cannot import.
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

const markdown = (text: string): ComponentsNode => ({ type: 'markdown', text });

const quote = (text: string): string =>
  text
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');

const section = (title: string, ...body: ComponentsNode[]): ComponentsNode => ({
  type: 'section',
  title,
  body,
});

const collapsibleSection = (title: string, ...body: ComponentsNode[]): ComponentsNode => ({
  type: 'section',
  title,
  collapsible: true,
  body,
});

const codeSpan = (value: string): string => `\`${value.replace(/`/g, "'")}\``;

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const truncateAtSentence = (value: string, max: number): string => {
  if (value.length <= max) {
    return value;
  }
  const fitting = value.slice(0, max);
  const end = Math.max(
    fitting.lastIndexOf('. '),
    fitting.lastIndexOf('! '),
    fitting.lastIndexOf('? ')
  );
  return end > max / 2 ? fitting.slice(0, end + 1) : truncate(value, max);
};

const LIST_ITEM = /^\s*([-*+]|\d+\.)\s/;

const splitLead = (text: string): { lead: string; rest: string } => {
  const trimmed = text.trim();
  const [firstLine] = trimmed.split('\n');
  const sentence = /^(.+?[.!?])(?=\s+[A-Z`*_]|$)/.exec(firstLine)?.[1];
  const lead = (sentence ?? firstLine).replace(LIST_ITEM, '');
  const cut = truncate(lead, MAX_LEAD_LENGTH);
  return {
    lead: cut,
    rest: cut === lead ? trimmed.slice(trimmed.indexOf(lead) + lead.length).trim() : trimmed,
  };
};

const affectedLine = (impact: NotifiableInvestigation['impact']): string => {
  const names = (impact?.entities ?? []).map(({ name }) => oneLine(name)).filter(Boolean);
  const hidden = names.length - MAX_AFFECTED;
  return names.length > 0
    ? `Affected: ${names.slice(0, MAX_AFFECTED).map(codeSpan).join(', ')}${
        hidden > 0 ? ` +${hidden} more` : ''
      }`
    : '';
};

interface Finding {
  label: string;
  lead: string;
  detail: string;
}

const findingsOf = ({ summary, verdict, impact }: NotifiableInvestigation): Finding[] => {
  const happened = summary?.trim() ? splitLead(summary) : undefined;
  const impacted = impact?.summary?.trim() ? splitLead(impact.summary) : undefined;
  const affected = affectedLine(impact);
  const concluded = verdict?.trim() ? splitLead(verdict) : undefined;
  const found: Array<Finding | undefined> = [
    happened && { label: 'What happened', lead: happened.lead, detail: happened.rest },
    impacted
      ? {
          label: 'Impact',
          lead: impacted.lead,
          detail: [impacted.rest, affected].filter(Boolean).join('\n\n'),
        }
      : affected
      ? { label: 'Impact', lead: affected, detail: '' }
      : undefined,
    concluded && { label: 'Conclusion', lead: concluded.lead, detail: concluded.rest },
  ];
  // A lead another finding already states moves into its details, so no sentence is lost.
  const seen = new Set<string>();
  return found
    .filter((finding): finding is Finding => Boolean(finding))
    .map((finding) => {
      const key = oneLine(finding.lead).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        return finding;
      }
      return {
        ...finding,
        lead: '',
        detail: [finding.lead, finding.detail].filter(Boolean).join('\n\n'),
      };
    });
};

// A quote holds only text, so a conclusion with a list stays plain to keep it together.
const asQuoteOrList = (text: string): string => (LIST_ITEM.test(text) ? text : quote(text));

// One node per finding: Isomer spaces consecutive blocks apart, which a single block would not.
const leadNodes = (findings: Finding[]): ComponentsNode[] =>
  findings
    .filter(({ lead }) => lead)
    .map(({ label, lead }) =>
      markdown(`**${label}**\n${label === 'Conclusion' ? quote(lead) : lead}`)
    );

const resultOf = (reason: string): string => {
  const marked = /\*\*Result:?\*\*:?\s*([\s\S]*?)(?=\*\*[^*\n]+:\*\*|\*\*[^*\n]+\*\*:|$)/i.exec(
    reason
  )?.[1];
  return truncateAtSentence((marked ?? reason).trim(), MAX_RESULT_LENGTH);
};

// Dismissed hypotheses are not findings. Without a confirmed one, the leading open one stands in.
const hypothesesNodes = (
  hypotheses: NonNullable<NotifiableInvestigation['hypotheses']>
): ComponentsNode[] => {
  const byConfidence = [...hypotheses].sort((a, b) => b.confidence - a.confidence);
  const confirmed = byConfidence.filter(({ status }) => status === 'confirmed');
  const shown =
    confirmed.length > 0
      ? confirmed.slice(0, MAX_HYPOTHESES)
      : byConfidence.filter(({ status }) => status === 'investigating').slice(0, 1);
  if (shown.length === 0) {
    return [];
  }
  const items = shown.map(({ candidate, confidence, status, reason }) => {
    const heading = `**${truncate(oneLine(candidate), MAX_CANDIDATE_LENGTH)}** _(${capitalize(
      status
    )} · ${Math.round(confidence * 100)}%)_`;
    const result = resultOf(reason ?? '');
    return result ? `${heading}\n\n**Result:** ${result}` : heading;
  });
  return [markdown(`**Hypotheses**\n\n${items.join('\n\n')}`)];
};

const detailsSection = (
  findings: Finding[],
  hypotheses: NotifiableInvestigation['hypotheses']
): ComponentsNode[] => {
  const groups: ComponentsNode[][] = [
    ...findings
      .filter(({ detail }) => detail)
      .map(({ label, detail }) => {
        const text = truncateAtSentence(detail, MAX_DETAIL_LENGTH);
        return [markdown(`**${label}**\n\n${label === 'Conclusion' ? asQuoteOrList(text) : text}`)];
      }),
    hypothesesNodes(hypotheses ?? []),
  ].filter((group) => group.length > 0);
  return groups.length > 0
    ? [
        collapsibleSection(
          'Investigation details',
          ...groups.flatMap((group, index) =>
            index > 0 ? [{ type: 'divider' as const }, ...group] : group
          )
        ),
      ]
    : [];
};

const context = (...items: string[]): ComponentsNode[] => {
  const present = items.filter(Boolean);
  return present.length > 0
    ? [
        {
          type: 'context',
          items: present.map((text) => ({
            text: truncate(oneLine(text), MAX_CONTEXT_ITEM_LENGTH),
          })),
        },
      ]
    : [];
};

const openInvestigation = (url: string): ComponentsNode => ({
  type: 'actions',
  buttons: [{ label: 'View Full Investigation', url, primary: true }],
});

const timedOutLabel = (): string =>
  i18n.translate('xpack.nightshiftInvestigations.notifications.timedOutLabel', {
    defaultMessage: 'Investigation timed out',
  });

/** Lays an investigation's lifecycle message out as an Isomer composition. */
export const buildInvestigationSlackComposition = ({
  investigation,
  url,
  automationName,
  phase = 'completed',
  reason,
}: {
  investigation: NotifiableInvestigation;
  url: string;
  automationName?: string;
  phase?: NotificationPhase;
  reason?: string;
}): ComponentsNode[] => {
  const title: ComponentsNode = {
    type: 'header',
    text: truncate(oneLine(investigation.title) || 'Investigation', MAX_HEADER_LENGTH),
  };
  const automation = automationName ? `Automation: ${oneLine(automationName)}` : '';

  if (phase === 'started') {
    return [
      title,
      ...context(':hourglass_flowing_sand: Investigating…', automation),
      openInvestigation(url),
    ];
  }

  if (phase === 'failed' || phase === 'timed_out') {
    const outcome = phase === 'timed_out' ? timedOutLabel() : 'Investigation failed';
    const failureReason = reason?.trim() || investigation.error?.trim() || outcome;
    return [
      title,
      ...context(`:warning: ${outcome}`, automation),
      section('What went wrong', markdown(truncate(failureReason, MAX_SUMMARY_LENGTH))),
      openInvestigation(url),
    ];
  }

  const findings = findingsOf(investigation);

  return [
    title,
    ...context(
      investigation.severity ? `Severity: ${SEVERITY_LABELS[investigation.severity]}` : '',
      automation
    ),
    ...leadNodes(findings),
    ...detailsSection(findings, investigation.hypotheses),
    openInvestigation(url),
  ];
};

/** Renders the composition as Slack blocks and fallback text, throwing if Isomer rejects it. */
export const renderInvestigationSlackMessage = ({
  runtime,
  ...params
}: Parameters<typeof buildInvestigationSlackComposition>[0] & {
  runtime: KibanaIsomerRuntime;
}): { text: string; blocks: SlackBlock[] } => {
  const { text, blocks } = runtime.surfaces.slack.render(
    { type: 'view', body: buildInvestigationSlackComposition(params) },
    { heading: false }
  );
  return {
    text,
    // `section` cannot set the container width, and a card shrinks to its content without it.
    // https://docs.slack.dev/reference/block-kit/blocks/container-block
    blocks: (blocks as SlackBlock[]).map((block) =>
      block.type === 'container' ? { ...block, width: 'full' } : block
    ),
  };
};

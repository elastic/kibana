/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md, serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { clampSlackText } from '@elastic/isomer-sdk/slack';
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

const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

const markdown = (text: string): ComponentsNode => ({ type: 'markdown', text });

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
  return end > max / 2 ? fitting.slice(0, end + 1) : clampSlackText(value, max);
};

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;

const splitLead = (text: string): { lead: string; rest: string } => {
  const trimmed = text.trim();
  const unlisted = trimmed.replace(LIST_ITEM, '');
  const [firstLine] = unlisted.split('\n');
  const sentence = /^(.+?[.!?])(?=\s+[A-Z`*_]|$)/.exec(firstLine)?.[1] ?? firstLine;
  const lead = clampSlackText(sentence, MAX_LEAD_LENGTH);
  return {
    lead,
    rest: lead === sentence ? unlisted.slice(sentence.length).trim() : trimmed,
  };
};

const affectedLine = (impact: NotifiableInvestigation['impact']): string => {
  const names = (impact?.entities ?? []).map(({ name }) => oneLine(name)).filter(Boolean);
  if (names.length === 0) {
    return '';
  }
  const hidden = names.length - MAX_AFFECTED;
  return serializeMarkdown(
    md.paragraph(
      'Affected: ',
      ...names
        .slice(0, MAX_AFFECTED)
        .flatMap((name, index) => (index > 0 ? [', ', md.code(name)] : [md.code(name)])),
      ...(hidden > 0 ? [` +${hidden} more`] : [])
    )
  );
};

interface Finding {
  label: string;
  lead: string;
  detail: string;
  /** Kept whole after the detail is cut, so a long detail cannot drop it. */
  tail?: string;
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
          detail: impacted.rest,
          tail: affected,
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

const conclusionBody = (text: string) =>
  LIST_ITEM.test(text) ? md.authored(text) : md.blockquote(md.authored(text));

// One node per finding: Isomer spaces consecutive blocks apart, which a single block would not.
const leadNodes = (findings: Finding[]): ComponentsNode[] =>
  findings
    .filter(({ lead }) => lead)
    .map(({ label, lead }) =>
      markdown(
        label === 'Conclusion'
          ? serializeMarkdown([md.paragraph(md.strong(label)), md.blockquote(md.authored(lead))])
          : `**${label}**\n${lead}`
      )
    );

const RESULT_SECTION =
  /\*\*Result:?\*\*:?\s*([\s\S]*?)(?=\s+\*\*[Tt]ested:?\*\*:?|\n\s*\*\*[A-Z][a-z]+(?::\*\*|\*\*:)|$)/i;
const TESTED_SECTION = /\*\*Tested:?\*\*:?[^\n]*(?:\n|$)/gi;

const hypothesisDetail = (reason: string): string => {
  const marked = RESULT_SECTION.exec(reason)?.[1];
  if (marked !== undefined) {
    const result = truncateAtSentence(marked.trim(), MAX_RESULT_LENGTH);
    return result ? `**Result:** ${result}` : '';
  }
  return truncateAtSentence(reason.replace(TESTED_SECTION, '').trim(), MAX_RESULT_LENGTH);
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
  const items = shown.flatMap(({ candidate, confidence, status, reason }) => {
    const heading = md.paragraph(
      md.strong(clampSlackText(oneLine(candidate), MAX_CANDIDATE_LENGTH)),
      ' ',
      md.emphasis(`(${capitalize(status)} · ${Math.round(confidence * 100)}%)`)
    );
    const detail = hypothesisDetail(reason ?? '');
    return detail ? [heading, md.authored(detail)] : [heading];
  });
  return [markdown(serializeMarkdown([md.paragraph(md.strong('Hypotheses')), ...items]))];
};

const detailsSection = (
  findings: Finding[],
  hypotheses: NotifiableInvestigation['hypotheses']
): ComponentsNode[] => {
  const groups: ComponentsNode[][] = [
    ...findings
      .filter(({ detail, tail }) => detail || tail)
      .map(({ label, detail, tail }) => {
        const text = [truncateAtSentence(detail, MAX_DETAIL_LENGTH), tail]
          .filter(Boolean)
          .join('\n\n');
        return [
          markdown(
            serializeMarkdown([
              md.paragraph(md.strong(label)),
              label === 'Conclusion' ? conclusionBody(text) : md.authored(text),
            ])
          ),
        ];
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
            text: clampSlackText(oneLine(text), MAX_CONTEXT_ITEM_LENGTH),
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
    text: clampSlackText(oneLine(investigation.title) || 'Investigation', MAX_HEADER_LENGTH),
  };
  const automation = automationName ? `Automation: ${oneLine(automationName)}` : '';

  if (phase === 'started') {
    return [title, ...context('⏳ Investigating…', automation), openInvestigation(url)];
  }

  if (phase === 'failed' || phase === 'timed_out') {
    const outcome = phase === 'timed_out' ? timedOutLabel() : 'Investigation failed';
    const failureReason = reason?.trim() || investigation.error?.trim() || outcome;
    return [
      title,
      ...context(`⚠️ ${outcome}`, automation),
      section('What went wrong', markdown(clampSlackText(failureReason, MAX_SUMMARY_LENGTH))),
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
    // `section` cannot set the container width or initial collapsed state.
    // https://docs.slack.dev/reference/block-kit/blocks/container-block
    blocks: (blocks as SlackBlock[]).map((block) =>
      block.type === 'container'
        ? {
            ...block,
            width: 'full',
            ...(block.is_collapsible ? { default_collapsed: true } : {}),
          }
        : block
    ),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RumErrorGroup, RumPageRow } from './rum_app';
import type { RumAppInventoryRow } from './rum_apps';
import { describeRumScope } from './rum_llm';
import type { RumSessionSummary } from './session_replay';

export interface EvidenceFact {
  id: 'firing' | 'score' | 'opportunity';
  title: string;
  description: string;
}

const formatDelta = (value: number): string => `${value > 0 ? '+' : ''}${Math.round(value)}`;

const formatMs = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;

/** Headline facts from the inventory row. Lists (pages/errors/sessions) load separately. */
export const buildEvidenceFacts = (app: RumAppInventoryRow, firing: boolean): EvidenceFact[] => {
  const facts: EvidenceFact[] = [];
  if (firing) {
    facts.push({
      id: 'firing',
      title: i18n.translate('xpack.ux.evidence.firingTitle', { defaultMessage: 'Alert' }),
      description: i18n.translate('xpack.ux.evidence.firingDescription', {
        defaultMessage: 'A scoped rule is firing for this app.',
      }),
    });
  }
  if (app.score != null) {
    const delta =
      app.scoreDelta == null || Math.round(app.scoreDelta) === 0
        ? ''
        : i18n.translate('xpack.ux.evidence.scoreDeltaDescription', {
            defaultMessage: ' ({delta} vs previous period)',
            values: { delta: formatDelta(app.scoreDelta) },
          });
    facts.push({
      id: 'score',
      title: i18n.translate('xpack.ux.evidence.scoreTitle', { defaultMessage: 'Score' }),
      description: i18n.translate('xpack.ux.evidence.scoreDescription', {
        defaultMessage: '{score} of 100{delta}',
        values: { score: app.score, delta },
      }),
    });
  }
  if (app.opportunity != null) {
    const room = app.score == null ? 0 : 100 - app.score;
    facts.push({
      id: 'opportunity',
      title: i18n.translate('xpack.ux.evidence.opportunityTitle', {
        defaultMessage: 'Opportunity',
      }),
      description: i18n.translate('xpack.ux.evidence.opportunityDescription', {
        defaultMessage: '{value} — {room} points to 100, weighted by session share',
        values: { value: app.opportunity, room },
      }),
    });
  }
  return facts.slice(0, 3);
};

export const worstPagesByLcp = (pages: RumPageRow[], limit = 3): RumPageRow[] =>
  [...pages]
    .filter((page) => page.p75Lcp != null)
    .sort((left, right) => (right.p75Lcp ?? 0) - (left.p75Lcp ?? 0))
    .slice(0, limit);

export const topErrorGroups = (groups: RumErrorGroup[], limit = 3): RumErrorGroup[] =>
  [...groups].sort((left, right) => right.sessionCount - left.sessionCount).slice(0, limit);

interface EvidencePackArgs {
  app: RumAppInventoryRow;
  rangeFrom: string;
  rangeTo: string;
  facts: EvidenceFact[];
  pages: RumPageRow[];
  errors: RumErrorGroup[];
  sessions: RumSessionSummary[];
}

const evidencePackBody = ({
  facts,
  pages,
  errors,
  sessions,
}: Pick<EvidencePackArgs, 'facts' | 'pages' | 'errors' | 'sessions'>): string => {
  const pageLines = pages.map((page) =>
    page.p75Lcp == null
      ? `• ${page.path} (${page.views} views)`
      : `• ${page.path}: LCP ${formatMs(page.p75Lcp)} (${page.views} views)`
  );
  const errorLines = errors.map(
    (group) => `• ${group.type}: ${group.message} (${group.sessionCount} sessions)`
  );
  const sessionLines = sessions.map((session) => `• ${session.sessionId}`);
  return `Facts:
${facts.map((fact) => `• ${fact.title}: ${fact.description}`).join('\n') || '• None'}

Slowest pages:
${pageLines.join('\n') || '• None'}

Top errors:
${errorLines.join('\n') || '• None'}

Session IDs:
${sessionLines.join('\n') || '• None'}`;
};

export const evidenceAnalystPrompt = ({
  app,
  rangeFrom,
  rangeTo,
  facts,
  pages,
  errors,
  sessions,
}: EvidencePackArgs): string => {
  const header = describeRumScope({
    rangeFrom,
    rangeTo,
    serviceName: app.name,
  });
  return `${header}

Investigate ${
    app.name
  } from the Applications evidence pack. Use only these facts and observability.ux tools. Do not invent session IDs, pages, or error groups. Recommend one next step.

${evidencePackBody({ facts, pages, errors, sessions })}`;
};

/** One-shot flyout prompt: brief + whether a GitHub issue is warranted. */
export const evidenceSummaryPrompt = ({
  app,
  rangeFrom,
  rangeTo,
  facts,
  pages,
  errors,
  sessions,
}: EvidencePackArgs): string => {
  const header = describeRumScope({
    rangeFrom,
    rangeTo,
    serviceName: app.name,
  });
  return `${header}

Summarize this Applications evidence pack for ${
    app.name
  }. Use only the facts below. Do not invent session IDs, pages, or error groups.

Write a short markdown brief: one headline, 3–5 bullets, then one next step (name a session ID if any were given).

Then end with this fenced block and nothing after it:

\`\`\`evidence
{"fileIssue": true, "issueTitle": "short concrete title"}
\`\`\`

Set fileIssue to true only when there is a concrete defect worth a GitHub issue (errors, poor vitals, firing alert). If the app looks healthy or the data is sparse, set fileIssue to false and omit issueTitle.

${evidencePackBody({ facts, pages, errors, sessions })}`;
};

export const evidenceAnalystFollowUp = (
  args: EvidencePackArgs,
  summaryMarkdown: string
): string => `${evidenceAnalystPrompt(args)}

Analyst summary already shown in the evidence pack:
${summaryMarkdown}

Continue from that summary. Use tools only if you need more. Recommend one next step.`;

export interface EvidenceSummaryResult {
  markdown: string;
  fileIssue: boolean;
  issueTitle?: string;
}

const EVIDENCE_FENCE = /```evidence\s*([\s\S]*?)```/;

/** Drop an in-progress evidence fence while the model is still streaming. */
export const visibleEvidenceSummary = (text: string): string =>
  text.replace(/```evidence[\s\S]*$/i, '').trim();

export const parseEvidenceSummary = (text: string): EvidenceSummaryResult => {
  const match = text.match(EVIDENCE_FENCE);
  let fileIssue = false;
  let issueTitle: string | undefined;
  if (match) {
    try {
      const parsed = JSON.parse(match[1]) as { fileIssue?: unknown; issueTitle?: unknown };
      fileIssue = parsed.fileIssue === true;
      if (typeof parsed.issueTitle === 'string' && parsed.issueTitle.trim()) {
        issueTitle = parsed.issueTitle.trim();
      }
    } catch {
      fileIssue = false;
    }
  }
  return {
    markdown: (match ? text.slice(0, match.index) : text).trim(),
    fileIssue,
    issueTitle,
  };
};

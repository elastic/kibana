/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { InvestigationHypothesis, InvestigationState } from '@kbn/significant-events-schema';
import type { InvestigationStatus } from '@kbn/investigation-output';
import { formatShortTime } from '../common/format_timestamp';

export {
  getInvestigationProgressStatusLabel,
  getInvestigationWorkflowStatusLabel,
  isInvestigationInvestigated,
  isInvestigationTerminalFailure,
} from '../common/investigation_progress_status';

export interface InvestigationRecommendation {
  title: string;
  description?: string;
  code?: string;
  confidence?: number;
}

export interface BlindSpotItem {
  title: string;
  description: string;
}

const NEXT_STEP_SECTION_TITLES = ['next steps', 'recommendations', 'try next'];

export const formatInvestigationDuration = (
  startedAt: string,
  endedAt: number | string
): string => {
  const minutes = Math.max(
    0,
    Math.round(moment.duration(moment(endedAt).diff(moment(startedAt))).asMinutes())
  );

  if (minutes < 1) {
    return i18n.translate('xpack.nightshift.investigation.durationUnderOneMinute', {
      defaultMessage: '< 1 min',
    });
  }

  return i18n.translate('xpack.nightshift.investigation.durationMinutes', {
    defaultMessage: '{minutes} min',
    values: { minutes },
  });
};

export const getInvestigationTimeLabel = ({
  startedAt,
  endedAt,
  isRunning,
}: {
  startedAt: string;
  endedAt?: number | string;
  isRunning: boolean;
}): string => {
  const time = formatShortTime(startedAt);
  const duration = formatInvestigationDuration(startedAt, endedAt ?? Date.now());

  if (isRunning) {
    return i18n.translate('xpack.nightshift.investigation.sinceTimeDuration', {
      defaultMessage: 'Since {time} ({duration})',
      values: { time, duration },
    });
  }

  return i18n.translate('xpack.nightshift.investigation.completedTimeDuration', {
    defaultMessage: '{time} ({duration})',
    values: { time, duration },
  });
};

export const getInvestigationCompleteStatusLabel = (): string =>
  i18n.translate('xpack.nightshift.investigation.statusComplete', {
    defaultMessage: 'Complete',
  });

export const getPrimaryHypothesis = (
  hypotheses: InvestigationHypothesis[] | undefined
): InvestigationHypothesis | undefined => {
  const list = hypotheses ?? [];
  return (
    list.find((hypothesis) => hypothesis.status === 'investigating') ??
    list.find((hypothesis) => hypothesis.status === 'confirmed') ??
    list[0]
  );
};

export const getInvestigationHeadline = ({
  eventTitle,
  state,
  status,
}: {
  eventTitle: string;
  state?: InvestigationState;
  status: InvestigationStatus;
}): string => {
  const primaryHypothesis = getPrimaryHypothesis(state?.hypotheses);
  if (status === 'complete' && primaryHypothesis?.status === 'confirmed') {
    return primaryHypothesis.candidate;
  }
  if (primaryHypothesis?.candidate) {
    return primaryHypothesis.candidate;
  }
  if (state?.summary?.trim()) {
    return state.summary.trim();
  }
  return eventTitle;
};

export const getInvestigationGoalText = (state?: InvestigationState): string | undefined => {
  if (!state?.summary?.trim()) {
    return undefined;
  }
  return state.summary.trim();
};

const extractMarkdownSection = (markdown: string, sectionTitles: string[]): string | undefined => {
  const lines = markdown.split('\n');
  let startIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('#')) {
      continue;
    }
    const heading = line
      .replace(/^#+\s*/, '')
      .trim()
      .toLowerCase();
    if (sectionTitles.includes(heading)) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex < 0) {
    return undefined;
  }

  const sectionLines: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith('#')) {
      break;
    }
    sectionLines.push(lines[index]);
  }

  return sectionLines.join('\n').trim() || undefined;
};

const trimRecommendationDescription = (description: string): string =>
  description.trim().replace(/:$/, '');

const trimRecommendationTitle = (title: string): string => title.trim().replace(/:$/, '');

const normalizeRecommendationText = (text: string): string => {
  let normalized = text.trim();

  if (normalized.endsWith('**') && (normalized.match(/\*\*/g)?.length ?? 0) % 2 !== 0) {
    normalized = normalized.slice(0, -2).trim();
  }

  return trimRecommendationTitle(normalized);
};

const splitRecommendationBullet = (bullet: string): InvestigationRecommendation => {
  const trimmed = normalizeRecommendationText(bullet.replace(/^[-*]\s*/, '').trim());
  const dotSeparator = trimmed.indexOf(' · ');
  if (dotSeparator > 0) {
    return {
      title: trimRecommendationTitle(trimmed.slice(0, dotSeparator)),
      description: trimRecommendationDescription(trimmed.slice(dotSeparator + 3)),
    };
  }

  const sentenceEnd = trimmed.search(/[.!?](?:\s|$)/);
  if (sentenceEnd > 0 && sentenceEnd < trimmed.length - 1) {
    return {
      title: trimRecommendationTitle(trimmed.slice(0, sentenceEnd + 1)),
      description: trimRecommendationDescription(trimmed.slice(sentenceEnd + 1)),
    };
  }

  return { title: trimRecommendationTitle(trimmed) };
};

const parseNextStepsRecommendations = (section: string): InvestigationRecommendation[] => {
  const recommendations: InvestigationRecommendation[] = [];
  let isCollectingCode = false;
  let codeLines: string[] = [];

  const attachCodeToLastRecommendation = (code: string | undefined): void => {
    if (!code || recommendations.length === 0) {
      return;
    }

    recommendations[recommendations.length - 1].code = code;
  };

  for (const rawLine of section.split('\n')) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (isCollectingCode) {
        attachCodeToLastRecommendation(codeLines.join('\n').trim() || undefined);
        codeLines = [];
        isCollectingCode = false;
      } else {
        isCollectingCode = true;
      }
      continue;
    }

    if (isCollectingCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      recommendations.push(splitRecommendationBullet(trimmed));
    }
  }

  if (isCollectingCode) {
    attachCodeToLastRecommendation(codeLines.join('\n').trim() || undefined);
  }

  return recommendations;
};

export const parseInvestigationRecommendations = (
  state?: InvestigationState
): InvestigationRecommendation[] => {
  const fromConclusion = state?.conclusion
    ? extractMarkdownSection(state.conclusion, NEXT_STEP_SECTION_TITLES)
    : undefined;

  const bulletRecommendations = fromConclusion ? parseNextStepsRecommendations(fromConclusion) : [];

  if (bulletRecommendations.length > 0) {
    return bulletRecommendations;
  }

  return [...(state?.hypotheses ?? [])]
    .sort((first, second) => second.confidence - first.confidence)
    .filter((hypothesis) => hypothesis.status !== 'dismissed' || hypothesis.confidence >= 0.5)
    .map((hypothesis) => ({
      title: hypothesis.candidate,
      description: hypothesis.reason,
      confidence: hypothesis.confidence,
    }));
};

export const getPrimaryRecommendation = (
  state?: InvestigationState
): InvestigationRecommendation | undefined => parseInvestigationRecommendations(state)[0];

const escapeMarkdownInline = (text: string): string => text.replace(/([\\`*_[\]])/g, '\\$1');

export const formatBlindSpotMarkdown = ({ title, description }: BlindSpotItem): string =>
  `**${escapeMarkdownInline(title)}** · ${escapeMarkdownInline(description)}`;

export const mapBlindSpots = (gaps: string[] | undefined): BlindSpotItem[] =>
  (gaps ?? []).map((gap) => {
    const separatorIndex = gap.indexOf(' · ');
    if (separatorIndex > 0) {
      return {
        title: gap.slice(0, separatorIndex).trim(),
        description: gap.slice(separatorIndex + 3).trim(),
      };
    }

    const sentenceEnd = gap.search(/[.!?](?:\s|$)/);
    if (sentenceEnd > 0 && sentenceEnd < gap.length - 1) {
      return {
        title: gap.slice(0, sentenceEnd + 1).trim(),
        description: gap.slice(sentenceEnd + 1).trim(),
      };
    }

    return {
      title: gap.trim(),
      description: gap.trim(),
    };
  });

export const getConclusionBody = (conclusion: string | undefined): string | undefined => {
  if (!conclusion?.trim()) {
    return undefined;
  }

  const body = extractMarkdownSection(conclusion, ['conclusion']) ?? conclusion.trim();
  return body.replace(/^#+\s*conclusion\s*$/im, '').trim() || undefined;
};

export const sortInvestigationHypotheses = (
  hypotheses: InvestigationHypothesis[]
): InvestigationHypothesis[] =>
  [...hypotheses].sort((first, second) => second.confidence - first.confidence);

export const getHypothesisStatusLabel = (status: InvestigationHypothesis['status']): string => {
  switch (status) {
    case 'investigating':
      return i18n.translate('xpack.nightshift.investigation.hypothesisChecking', {
        defaultMessage: 'Checking',
      });
    case 'confirmed':
      return i18n.translate('xpack.nightshift.investigation.hypothesisConfirmed', {
        defaultMessage: 'Confirmed',
      });
    case 'dismissed':
      return i18n.translate('xpack.nightshift.investigation.hypothesisRejected', {
        defaultMessage: 'Rejected',
      });
    default:
      return i18n.translate('xpack.nightshift.investigation.hypothesisUnknown', {
        defaultMessage: 'Unknown',
      });
  }
};

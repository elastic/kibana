/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type {
  InvestigationBlindSpot,
  InvestigationHypothesis,
  InvestigationRecommendation,
  InvestigationState,
} from '@kbn/significant-events-schema';
import type { InvestigationStatus } from '@kbn/investigation-output';
import { formatShortTime } from '../common/format_timestamp';

export {
  getInvestigationProgressStatusLabel,
  getInvestigationWorkflowStatusLabel,
  isInvestigationInvestigated,
  isInvestigationTerminalFailure,
} from '../common/investigation_progress_status';

/**
 * One row of the Try next list: either a recommendation the agent emitted structurally, or one
 * derived from a hypothesis when the investigation reported none — the only case carrying a
 * `confidence`, since the agent's own recommendations have no such notion.
 */
export interface RecommendationItem extends InvestigationRecommendation {
  confidence?: number;
}

export type BlindSpotItem = InvestigationBlindSpot;

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

export const getConclusionText = (state?: InvestigationState): string | undefined =>
  state?.conclusion?.trim() || undefined;

export const parseInvestigationRecommendations = (
  state?: InvestigationState
): RecommendationItem[] => {
  if (state?.recommendations && state.recommendations.length > 0) {
    return state.recommendations;
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
): RecommendationItem | undefined => parseInvestigationRecommendations(state)[0];

const escapeMarkdownInline = (text: string): string => text.replace(/([\\`*_[\]])/g, '\\$1');

export const formatBlindSpotMarkdown = ({ title, description }: BlindSpotItem): string =>
  `**${escapeMarkdownInline(title)}** · ${escapeMarkdownInline(description)}`;

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

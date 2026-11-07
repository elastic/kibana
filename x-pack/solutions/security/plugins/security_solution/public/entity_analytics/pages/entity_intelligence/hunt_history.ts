/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  CreateHuntRequest,
  HuntListItem,
  HuntResultPayload,
  HuntSummary,
} from '../../../../common/entity_analytics/ai_hunt_history/types';
import type { HuntArtifact } from './hunt_artifacts';
import type { HuntActivity } from './hunt_stream_state';
import { buildHuntPresentation } from './hunt_result_presentation';

/** The parts of a completed hunt needed to build a persistable record. */
export interface CompletedHunt {
  question: string;
  scopedPrompt?: string;
  content: string;
  artifacts: HuntArtifact[];
  activities: HuntActivity[];
  status: 'running' | 'completed' | 'partial' | 'failed';
}

/** Preserves incomplete evidence when a stopped hunt is saved and reopened. */
export const toPersistedStatus = (status: CompletedHunt['status']): CreateHuntRequest['status'] => {
  if (status === 'failed') return 'error';
  if (status === 'completed') return 'complete';
  return status;
};

/** A saved running hunt has no live stream to resume, so its evidence is partial. */
export const fromPersistedStatus = (
  status: CreateHuntRequest['status']
): CompletedHunt['status'] => {
  if (status === 'error') return 'failed';
  if (status === 'complete') return 'completed';
  return 'partial';
};

/**
 * Derives the compact list-view summary (verdict + counts) from the same
 * presentation model the canvas renders, so the history list stays in sync
 * with what the analyst saw without re-running any analysis.
 */
export const buildHuntSummary = ({
  question,
  artifacts,
}: Pick<CompletedHunt, 'question' | 'artifacts'>): HuntSummary => {
  const presentation = buildHuntPresentation({ prompt: question, artifacts });
  return {
    verdict: presentation.verdict.summary || presentation.verdict.title,
    severity: presentation.verdict.severity,
    confidence: presentation.verdict.confidence,
    findingCount: presentation.findings.length,
    entityCount: presentation.affectedEntities.length,
    alertCount: artifacts.filter((artifact) => artifact.type === 'alert').length,
  };
};

/**
 * Shapes a completed hunt into the request body for the create endpoint. The
 * result payload keeps everything the canvas needs to re-render on reopen
 * (narrative content + structured artifacts + activity log).
 */
export const buildCreateHuntRequest = (hunt: CompletedHunt): CreateHuntRequest => {
  const result: HuntResultPayload = {
    content: hunt.content,
    // Artifacts/activities are stored opaquely; cast through the record shape
    // the persistence schema expects.
    artifacts: hunt.artifacts as unknown as Array<Record<string, unknown>>,
    activities: hunt.activities as unknown as Array<Record<string, unknown>>,
  };
  return {
    question: hunt.question,
    scopedPrompt: hunt.scopedPrompt,
    status: toPersistedStatus(hunt.status),
    summary: buildHuntSummary(hunt),
    result,
  };
};

/**
 * Sorts hunt list items for display: pinned first, then most recently updated.
 * Pure and stable so it can be unit tested and reused wherever the list renders.
 */
export const sortHuntListItems = (hunts: HuntListItem[]): HuntListItem[] =>
  [...hunts].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    const leftTime = Date.parse(left.updatedAt);
    const rightTime = Date.parse(right.updatedAt);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return rightTime - leftTime;
  });

/** Readable label for a hunt row: the analyst name if set, else the question. */
export const huntDisplayLabel = (hunt: Pick<HuntListItem, 'name' | 'question'>): string => {
  const trimmedName = hunt.name?.trim();
  if (trimmedName) return trimmedName;
  const firstLine = hunt.question.split(/[.:\n]/)[0].trim();
  if (firstLine.length <= 80) return firstLine || hunt.question.trim();
  return `${firstLine.slice(0, 77).trim()}…`;
};

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * Formats an ISO timestamp as a short relative label (e.g. "3 hours ago").
 * `now` is injectable so the output is deterministic under test.
 */
export const formatRelativeTime = (isoTimestamp: string, now: number = Date.now()): string => {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) return isoTimestamp;
  const diffMs = parsed - now;
  const absMs = Math.abs(diffMs);

  if (absMs < 60 * 1000) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.justNow',
      { defaultMessage: 'just now' }
    );
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'long' });
  for (const [unit, unitMs] of RELATIVE_UNITS) {
    if (absMs >= unitMs) {
      return formatter.format(Math.round(diffMs / unitMs), unit);
    }
  }
  return formatter.format(Math.round(diffMs / (60 * 1000)), 'minute');
};

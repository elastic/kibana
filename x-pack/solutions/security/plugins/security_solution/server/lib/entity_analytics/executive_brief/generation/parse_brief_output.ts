/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefConfidence,
  DecisionOwner,
  EvidenceId,
  ExecutiveBrief,
  ExecutiveBriefDecision,
  ExecutiveBriefStoryline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { BriefJobError } from '../job/job_errors';

type JsonRecord = Record<string, unknown>;

const CONFIDENCES: readonly BriefConfidence[] = ['high', 'medium', 'low'];
const URGENCIES: ReadonlyArray<ExecutiveBriefDecision['urgency']> = [
  'now',
  'this_week',
  'next_review',
];
const OWNERS: readonly DecisionOwner[] = [
  'soc',
  'it',
  'iam',
  'cloud',
  'detection_engineering',
  'leadership',
];

const fail = (path: string, expected: string): never => {
  throw new BriefJobError('llm_output', `Model output is invalid at ${path}: expected ${expected}`);
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const record = (value: unknown, path: string): JsonRecord =>
  isRecord(value) ? value : fail(path, 'an object');

const text = (value: unknown, path: string): string =>
  typeof value === 'string' ? value : fail(path, 'a string');

const list = (value: unknown, path: string): unknown[] =>
  Array.isArray(value) ? value : fail(path, 'an array');

const ids = (value: unknown, path: string): EvidenceId[] =>
  list(value, path).map((item, i) => text(item, `${path}[${i}]`) as EvidenceId);

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], path: string): T => {
  const candidate = text(value, path);
  const match = allowed.find((option) => option === candidate);
  return match ?? fail(path, `one of ${allowed.join(', ')}`);
};

/**
 * Checks the shape of the model output at runtime (the JSON schema is advisory for some
 * providers) and returns a typed brief. Evidence ids are NOT checked here: the validator does
 * that against the catalog. Throws a `llm_output` job error on a malformed shape.
 */
export const parseBriefOutput = (output: unknown): ExecutiveBrief => {
  const root = record(output, 'output');

  const glance = record(root.glance, 'glance');
  const blindSpots = record(root.blindSpots, 'blindSpots');

  const storylines: ExecutiveBriefStoryline[] = list(root.storylines, 'storylines').map(
    (item, i) => {
      const path = `storylines[${i}]`;
      const s = record(item, path);
      return {
        storylineId: text(
          s.storylineId,
          `${path}.storylineId`
        ) as ExecutiveBriefStoryline['storylineId'],
        title: text(s.title, `${path}.title`),
        narrative: text(s.narrative, `${path}.narrative`),
        whyItMatters: text(s.whyItMatters, `${path}.whyItMatters`),
        confidence: oneOf(s.confidence, CONFIDENCES, `${path}.confidence`),
        evidence: ids(s.evidence, `${path}.evidence`),
      };
    }
  );

  const decisions: ExecutiveBriefDecision[] = list(root.decisions, 'decisions').map((item, i) => {
    const path = `decisions[${i}]`;
    const d = record(item, path);
    return {
      action: text(d.action, `${path}.action`),
      rationale: text(d.rationale, `${path}.rationale`),
      urgency: oneOf(d.urgency, URGENCIES, `${path}.urgency`),
      ...(d.owner === undefined || d.owner === null
        ? {}
        : { owner: oneOf(d.owner, OWNERS, `${path}.owner`) }),
      relatesTo: text(d.relatesTo, `${path}.relatesTo`) as EvidenceId,
      targets: ids(d.targets, `${path}.targets`),
      evidence: ids(d.evidence, `${path}.evidence`),
      agentPrompt: text(d.agentPrompt, `${path}.agentPrompt`),
    };
  });

  const cross =
    root.crossStorylineConclusion === undefined || root.crossStorylineConclusion === null
      ? undefined
      : record(root.crossStorylineConclusion, 'crossStorylineConclusion');

  return {
    glance: {
      headline: text(glance.headline, 'glance.headline'),
      threatNarrative: text(glance.threatNarrative, 'glance.threatNarrative'),
      evidence: ids(glance.evidence, 'glance.evidence'),
    },
    storylines,
    ...(cross
      ? {
          crossStorylineConclusion: {
            statement: text(cross.statement, 'crossStorylineConclusion.statement'),
            confidence: oneOf(cross.confidence, CONFIDENCES, 'crossStorylineConclusion.confidence'),
            evidence: ids(cross.evidence, 'crossStorylineConclusion.evidence'),
          },
        }
      : {}),
    blindSpots: {
      summary: text(blindSpots.summary, 'blindSpots.summary'),
      evidence: ids(blindSpots.evidence, 'blindSpots.evidence'),
    },
    decisions,
  };
};

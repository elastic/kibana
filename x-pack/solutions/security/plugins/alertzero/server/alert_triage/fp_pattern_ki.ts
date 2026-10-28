/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import { HUNT_COVERAGE_AI_INDEX_ID } from '../../common/step_types/package_report';

export const TRIAGE_FP_PATTERN_KI_TYPE = 'security.triage_fp_pattern' as const;
export const TRIAGE_FP_PATTERN_PRODUCER = 'alertzero.triage.fp_pattern.v1' as const;

/** Same managed AI index Hunt coverage uses (`security-investigations`). */
export const TRIAGE_FP_PATTERN_AI_INDEX_DEST = getAiIndexDest('index', HUNT_COVERAGE_AI_INDEX_ID);

export const buildFpPatternKiId = ({
  spaceId,
  subjectKey,
}: {
  spaceId: string;
  subjectKey: string;
}): string => {
  const hash = createHash('sha256').update(`${spaceId}|${subjectKey}`).digest('hex');
  return `ki-triage-fp-${hash}`;
};

export interface FpPatternKiRecord {
  kiId: string;
  proposalId: string;
  conversationId: string;
  patternKey: string;
  ruleId: string;
  status: 'open' | 'closed';
}

export interface FpPatternKiEsClient {
  get: (params: {
    index: string;
    id: string;
  }) => Promise<{ _source?: Record<string, unknown> }>;
  index: (params: {
    index: string;
    id: string;
    document: Record<string, unknown>;
    refresh: 'wait_for';
  }) => Promise<unknown>;
}

const readErrorStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    return (error as { statusCode: number }).statusCode;
  }
  if (
    'meta' in error &&
    typeof (error as { meta?: { statusCode?: unknown } }).meta?.statusCode === 'number'
  ) {
    return (error as { meta: { statusCode: number } }).meta.statusCode;
  }
  return undefined;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

export const readFpPatternKi = async ({
  esClient,
  spaceId,
  subjectKey,
}: {
  esClient: FpPatternKiEsClient;
  spaceId: string;
  subjectKey: string;
}): Promise<FpPatternKiRecord | undefined> => {
  const kiId = buildFpPatternKiId({ spaceId, subjectKey });
  const { value: index } = TRIAGE_FP_PATTERN_AI_INDEX_DEST;
  try {
    const existing = await esClient.get({ index, id: kiId });
    const attributes = (existing._source?.attributes ?? {}) as Record<string, unknown>;
    if (asString(attributes.space_id) !== spaceId) {
      return undefined;
    }
    const proposalId = asString(attributes.proposal_id);
    const conversationId = asString(attributes.conversation_id);
    const patternKey = asString(attributes.pattern_key);
    const ruleId = asString(attributes.rule_id);
    const status = attributes.status === 'closed' ? 'closed' : 'open';
    if (!proposalId || !conversationId || !patternKey || !ruleId) {
      return undefined;
    }
    return { kiId, proposalId, conversationId, patternKey, ruleId, status };
  } catch (error) {
    if (readErrorStatusCode(error) === 404) {
      return undefined;
    }
    throw error;
  }
};

export const writeFpPatternKi = async ({
  esClient,
  spaceId,
  subjectKey,
  patternKey,
  ruleId,
  proposalId,
  conversationId,
  status = 'open',
}: {
  esClient: FpPatternKiEsClient;
  spaceId: string;
  subjectKey: string;
  patternKey: string;
  ruleId: string;
  proposalId: string;
  conversationId: string;
  status?: 'open' | 'closed';
}): Promise<string> => {
  const kiId = buildFpPatternKiId({ spaceId, subjectKey });
  const { value: index } = TRIAGE_FP_PATTERN_AI_INDEX_DEST;
  const now = new Date().toISOString();
  await esClient.index({
    index,
    id: kiId,
    document: {
      '@timestamp': now,
      id: kiId,
      updated_at: now,
      type: TRIAGE_FP_PATTERN_KI_TYPE,
      title: `Alert Triage FP pattern for ${ruleId}`,
      description: `Open false-positive closure grouping for pattern ${patternKey}`,
      content: patternKey,
      tags: ['consumer:alert_triage', `status:${status}`, 'watch:floor'],
      attributes: {
        status,
        rule_id: ruleId,
        pattern_key: patternKey,
        proposal_id: proposalId,
        conversation_id: conversationId,
        subject_key: subjectKey,
        producer: TRIAGE_FP_PATTERN_PRODUCER,
        space_id: spaceId,
        watch_id: 'floor',
      },
    },
    refresh: 'wait_for',
  });
  return kiId;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { TOKEN_USAGE_INDEX } from './constants';

export interface TokenUsageRecord {
  modelId: string | undefined;
  connectorId: string | undefined;
  featureId: string | undefined;
}

export interface RoutingProof {
  /** Model calls the inference plugin logged in the window. */
  total: number;
  /** Calls made by the judge; excluded from the check. */
  judgeCalls: number;
  /** Subject-side calls checked. */
  subjectCalls: number;
  /** Distinct `model.model_id` / `inference.feature_id` / `inference.connector_id` seen. */
  modelIds: string[];
  featureIds: string[];
  connectorIds: string[];
  /** Subject-side calls whose model is not the subject. Empty means routing is proven. */
  misrouted: TokenUsageRecord[];
}

/**
 * Whether a logged model id names the subject model. The inference plugin logs the provider's
 * own id while a connector id may carry a vendor prefix (`eis/anthropic-claude-5-opus`), so
 * the comparison is case-insensitive on the id's trailing path segment.
 */
export const modelIdMatchesSubject = (
  loggedModelId: string | undefined,
  subject: string | readonly string[]
) => {
  if (!loggedModelId) {
    return false;
  }
  const normalise = (id: string) => id.toLowerCase().replace(/^.*[/]/, '');
  const subjects = typeof subject === 'string' ? [subject] : subject;
  const logged = normalise(loggedModelId);
  // A vendor prefix (`anthropic-claude-5-opus` vs `claude-5-opus`) is the only tolerated
  // difference; `claude-5-5-opus` and `claude-5-opus` stay distinct.
  return subjects.some((id) => {
    const candidate = normalise(id);
    return (
      candidate === logged || candidate.endsWith(`-${logged}`) || logged.endsWith(`-${candidate}`)
    );
  });
};

/**
 * Splits token-usage records into judge and subject calls and lists the subject calls that
 * did not reach the subject model. A judge call is one on a judge connector id or judge model
 * id (and not the subject's). The index has no operation field, so this is the only
 * discriminator.
 */
export const buildRoutingProof = ({
  records,
  subjectModelId,
  judgeConnectorIds = [],
  judgeModelId,
}: {
  records: TokenUsageRecord[];
  /** Every id the subject may be logged under (provider model id, inference endpoint id). */
  subjectModelId: string | readonly string[];
  judgeConnectorIds?: string[];
  judgeModelId?: string;
}): RoutingProof => {
  const judgeIsSubject =
    judgeModelId !== undefined && modelIdMatchesSubject(judgeModelId, subjectModelId);
  const isJudge = (record: TokenUsageRecord) =>
    !modelIdMatchesSubject(record.modelId, subjectModelId) &&
    ((record.connectorId !== undefined && judgeConnectorIds.includes(record.connectorId)) ||
      (!judgeIsSubject &&
        judgeModelId !== undefined &&
        modelIdMatchesSubject(record.modelId, judgeModelId)));
  const subject = records.filter((record) => !isJudge(record));
  const distinct = (pick: (record: TokenUsageRecord) => string | undefined) =>
    [...new Set(subject.map(pick).filter((v): v is string => v !== undefined))].sort();
  return {
    total: records.length,
    judgeCalls: records.length - subject.length,
    subjectCalls: subject.length,
    modelIds: distinct((r) => r.modelId),
    featureIds: distinct((r) => r.featureId),
    connectorIds: distinct((r) => r.connectorId),
    misrouted: subject.filter((record) => !modelIdMatchesSubject(record.modelId, subjectModelId)),
  };
};

export const readTokenUsage = async ({
  esClient,
  since,
}: {
  esClient: EsClient;
  since: Date;
}): Promise<TokenUsageRecord[]> => {
  await esClient.indices.refresh({ index: TOKEN_USAGE_INDEX }).catch(() => undefined);
  const response = await esClient.search<{
    model?: { model_id?: string };
    inference?: { connector_id?: string; feature_id?: string };
  }>({
    index: TOKEN_USAGE_INDEX,
    size: 10_000,
    ignore_unavailable: true,
    query: { range: { '@timestamp': { gte: since.toISOString() } } },
    _source: ['model.model_id', 'inference.connector_id', 'inference.feature_id'],
  });
  return response.hits.hits.map(({ _source }) => ({
    modelId: _source?.model?.model_id,
    connectorId: _source?.inference?.connector_id,
    featureId: _source?.inference?.feature_id,
  }));
};

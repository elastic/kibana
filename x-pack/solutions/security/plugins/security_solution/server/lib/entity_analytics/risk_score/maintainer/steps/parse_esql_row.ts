/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { SearchHitRiskInput } from '../../../types';
import { RIEMANN_ZETA_S_VALUE, RIEMANN_ZETA_VALUE } from '../../constants';

export interface ParsedRiskScore {
  entity_id: string;
  alert_count: number;
  score: number;
  normalized_score: number;
  risk_inputs: SearchHitRiskInput[];
  related_entities: ParsedRelatedEntity[];
}

export interface ParsedResolutionScore {
  resolution_target_id: string;
  alert_count: number;
  score: number;
  normalized_score: number;
  risk_inputs: SearchHitRiskInput[];
  related_entities: ParsedRelatedEntity[];
}

export interface ParsedRelatedEntity {
  entity_id: string;
  relationship_type: string;
}

interface ParsedRiskInputPayload {
  id?: string;
  risk_score?: string;
  time?: string;
  rule_name?: string;
  rule_name_b64?: string;
  category?: string;
  category_b64?: string;
  entity_id?: string;
}

const parseRelatedEntitiesRaw = (
  contributingEntitiesRaw: string | string[] | undefined
): ParsedRelatedEntity[] => {
  if (contributingEntitiesRaw === undefined) {
    return [];
  }

  const dedupedEntities = new Map<string, ParsedRelatedEntity>();
  for (const rawEntry of [contributingEntitiesRaw].flat()) {
    if (typeof rawEntry !== 'string') {
      continue;
    }

    const [entityId, relationshipType] = rawEntry.split('|', 2);
    if (
      typeof entityId !== 'string' ||
      entityId.length === 0 ||
      typeof relationshipType !== 'string' ||
      relationshipType.length === 0 ||
      relationshipType === 'self'
    ) {
      continue;
    }

    const dedupeKey = `${entityId}|${relationshipType}`;
    if (!dedupedEntities.has(dedupeKey)) {
      dedupedEntities.set(dedupeKey, {
        entity_id: entityId,
        relationship_type: relationshipType,
      });
    }
  }

  return [...dedupedEntities.values()];
};

/**
 * Parses one base-score ES|QL row for maintainer scoring.
 *
 * Parsing is kept local to this path to avoid coupling with legacy flow helpers.
 */
export const parseEsqlBaseScoreRow =
  (index: string) =>
  (row: unknown[]): ParsedRiskScore => {
    const [count, score, _inputs, contributingEntitiesRawOrEntityId, maybeEntityId] = row as [
      number,
      number,
      string | string[],
      string | string[],
      string | undefined
    ];
    const usesContributingEntityColumn = maybeEntityId !== undefined;
    const entityId = usesContributingEntityColumn
      ? (maybeEntityId as string)
      : (contributingEntitiesRawOrEntityId as string);
    const contributingEntitiesRaw = usesContributingEntityColumn
      ? (contributingEntitiesRawOrEntityId as string | string[])
      : undefined;

    const inputs = [_inputs]
      .flat()
      .map((input, i) => {
        let parsedRiskInputData: ParsedRiskInputPayload = {};
        let ruleName: string | undefined;
        let category: string | undefined;

        try {
          parsedRiskInputData = JSON.parse(input) as ParsedRiskInputPayload;
          ruleName = parsedRiskInputData.rule_name_b64
            ? Buffer.from(parsedRiskInputData.rule_name_b64, 'base64').toString('utf-8')
            : parsedRiskInputData.rule_name;
          category = parsedRiskInputData.category_b64
            ? Buffer.from(parsedRiskInputData.category_b64, 'base64').toString('utf-8')
            : parsedRiskInputData.category;
        } catch {
          return null;
        }

        const value = parseFloat(parsedRiskInputData.risk_score ?? '');
        if (Number.isNaN(value) || typeof parsedRiskInputData.id !== 'string') {
          return null;
        }
        const currentScore = value / Math.pow(i + 1, RIEMANN_ZETA_S_VALUE);
        const otherFields = omit(parsedRiskInputData, [
          'risk_score',
          'rule_name',
          'rule_name_b64',
          'category',
          'category_b64',
        ]);

        return {
          id: parsedRiskInputData.id,
          ...otherFields,
          rule_name: ruleName,
          category,
          score: value,
          contribution: currentScore / RIEMANN_ZETA_VALUE,
          index,
          entity_id:
            typeof parsedRiskInputData.entity_id === 'string'
              ? parsedRiskInputData.entity_id
              : undefined,
        } as SearchHitRiskInput;
      })
      .filter((riskInput): riskInput is SearchHitRiskInput => riskInput !== null);

    return {
      entity_id: entityId,
      alert_count: count,
      score,
      normalized_score: score / RIEMANN_ZETA_VALUE,
      risk_inputs: inputs,
      related_entities: parseRelatedEntitiesRaw(contributingEntitiesRaw),
    };
  };

export const parseEsqlResolutionScoreRow =
  (index: string) =>
  (row: unknown[]): ParsedResolutionScore => {
    const [count, score, _inputs, contributingEntitiesRaw, resolutionTargetId] = row as [
      number,
      number,
      string | string[],
      string | string[],
      string
    ];

    const baseParsed = parseEsqlBaseScoreRow(index)([count, score, _inputs, resolutionTargetId]);

    return {
      resolution_target_id: resolutionTargetId,
      alert_count: baseParsed.alert_count,
      score: baseParsed.score,
      normalized_score: baseParsed.normalized_score,
      risk_inputs: baseParsed.risk_inputs,
      related_entities: parseRelatedEntitiesRaw(contributingEntitiesRaw),
    };
  };

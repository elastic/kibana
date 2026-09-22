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
}

export interface ParsedResolutionScore {
  resolution_target_id: string;
  alert_count: number;
  score: number;
  normalized_score: number;
  risk_inputs: SearchHitRiskInput[];
  related_entities: Array<{ entity_id: string; relationship_type: string }>;
}

/**
 * Parses one base-score ES|QL row for maintainer scoring.
 *
 * Parsing is kept local to this path to avoid coupling with legacy flow helpers.
 */
export const parseEsqlBaseScoreRow =
  (index: string) =>
  (row: unknown[]): ParsedRiskScore => {
    const [count, score, _inputs, entityId] = row as [number, number, string | string[], string];

    const inputs = [_inputs]
      .flat()
      .map((input, i) => {
        let parsedRiskInputData: Record<string, string> = {};
        let ruleName: string | undefined;
        let category: string | undefined;

        try {
          parsedRiskInputData = JSON.parse(input);
          ruleName = parsedRiskInputData.rule_name_b64
            ? Buffer.from(parsedRiskInputData.rule_name_b64, 'base64').toString('utf-8')
            : parsedRiskInputData.rule_name;
          category = parsedRiskInputData.category_b64
            ? Buffer.from(parsedRiskInputData.category_b64, 'base64').toString('utf-8')
            : parsedRiskInputData.category;
        } catch {
          return null;
        }

        const value = parseFloat(parsedRiskInputData.risk_score);
        if (Number.isNaN(value) || !parsedRiskInputData.id) {
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
        } as SearchHitRiskInput;
      })
      .filter((riskInput): riskInput is SearchHitRiskInput => riskInput !== null);

    return {
      entity_id: entityId,
      alert_count: count,
      score,
      normalized_score: score / RIEMANN_ZETA_VALUE,
      risk_inputs: inputs,
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

    const parsedRelatedEntities = [contributingEntitiesRaw]
      .flat()
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => {
        const [entityId, relationshipType] = entry.split('|', 2);
        return {
          entity_id: entityId,
          relationship_type: relationshipType,
        };
      })
      .filter(
        (entry) =>
          entry.entity_id?.length > 0 &&
          entry.relationship_type?.length > 0 &&
          entry.relationship_type !== 'self'
      );

    return {
      resolution_target_id: resolutionTargetId,
      alert_count: baseParsed.alert_count,
      score: baseParsed.score,
      normalized_score: baseParsed.normalized_score,
      risk_inputs: baseParsed.risk_inputs,
      related_entities: parsedRelatedEntities,
    };
  };

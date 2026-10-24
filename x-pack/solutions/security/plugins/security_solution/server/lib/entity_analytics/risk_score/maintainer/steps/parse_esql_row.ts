/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHitRiskInput } from '../../../types';
import { MAX_INPUTS_COUNT, RIEMANN_ZETA_S_VALUE, getRiemannZetaValue } from '../../constants';
import { RISK_INPUT_SEPARATOR } from '../../calculate_esql_risk_scores';

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

/** The weight divisor of the input at each position, as the risk score's zeta series uses it. */
const POSITION_DIVISORS = Array.from({ length: MAX_INPUTS_COUNT }, (_, i) =>
  Math.pow(i + 1, RIEMANN_ZETA_S_VALUE)
);
const positionDivisor = (i: number): number =>
  POSITION_DIVISORS[i] ?? Math.pow(i + 1, RIEMANN_ZETA_S_VALUE);

const numberAt = (row: unknown[], i: number): number => {
  const value = row[i];
  return typeof value === 'number' ? value : Number(value);
};

const stringAt = (row: unknown[], i: number): string => {
  const value = row[i];
  return typeof value === 'string' ? value : String(value);
};

/** A single value comes back as itself, several as an array. */
const valuesAt = (row: unknown[], i: number): unknown[] => {
  const value = row[i];
  return Array.isArray(value) ? value : [value];
};

/**
 * Reads one risk input: `risk_score|time|alert_id|rule_name`, behind a zero-padded score key when
 * the query sorted inputs as strings. The rule name is everything after the third separator, so it
 * may contain any character. Undefined when the input doesn't fit that shape.
 */
const parseRiskInput = (
  input: unknown,
  position: number,
  index: string,
  zetaValue: number,
  sortKeyed: boolean
): SearchHitRiskInput | undefined => {
  if (typeof input !== 'string') {
    return undefined;
  }
  const start = sortKeyed ? input.indexOf(RISK_INPUT_SEPARATOR) + 1 : 0;
  const scoreEnd = input.indexOf(RISK_INPUT_SEPARATOR, start);
  const timeEnd = scoreEnd === -1 ? -1 : input.indexOf(RISK_INPUT_SEPARATOR, scoreEnd + 1);
  const idEnd = timeEnd === -1 ? -1 : input.indexOf(RISK_INPUT_SEPARATOR, timeEnd + 1);
  if ((sortKeyed && start === 0) || idEnd === -1) {
    return undefined;
  }
  const value = parseFloat(input.slice(start, scoreEnd));
  const id = input.slice(timeEnd + 1, idEnd);
  if (Number.isNaN(value) || id.length === 0) {
    return undefined;
  }
  const ruleName = input.slice(idEnd + 1);
  return {
    id,
    time: input.slice(scoreEnd + 1, timeEnd),
    index,
    rule_name: ruleName.length > 0 ? ruleName : undefined,
    score: value,
    contribution: value / positionDivisor(position) / zetaValue,
  };
};

/**
 * Reads the risk inputs one ES|QL row carries, in one pass. An input that doesn't fit the shape is
 * skipped; the others keep the weight of their position.
 */
const parseRiskInputs = (
  raw: unknown[],
  index: string,
  zetaValue: number,
  sortKeyed: boolean
): SearchHitRiskInput[] => {
  const inputs: SearchHitRiskInput[] = [];
  for (let i = 0; i < raw.length; i++) {
    const input = parseRiskInput(raw[i], i, index, zetaValue, sortKeyed);
    if (input) {
      inputs.push(input);
    }
  }
  return inputs;
};

/**
 * Parses one base-score ES|QL row for maintainer scoring.
 *
 * Parsing is kept local to this path to avoid coupling with legacy flow helpers.
 */
export const parseEsqlBaseScoreRow = (index: string, sampleSize: number) => {
  const zetaValue = getRiemannZetaValue(sampleSize);
  return (row: unknown[]): ParsedRiskScore => {
    const score = numberAt(row, 1);
    return {
      entity_id: stringAt(row, 3),
      alert_count: numberAt(row, 0),
      score,
      normalized_score: score / zetaValue,
      risk_inputs: parseRiskInputs(valuesAt(row, 2), index, zetaValue, false),
    };
  };
};

type RelatedEntity = ParsedResolutionScore['related_entities'][number];

/** A group member as `entity_id|relationship_type`; undefined for the target itself (`self`). */
const parseRelatedEntity = (entry: unknown): RelatedEntity | undefined => {
  const separator = typeof entry === 'string' ? entry.indexOf('|') : -1;
  if (typeof entry !== 'string' || separator <= 0) {
    return undefined;
  }
  const next = entry.indexOf('|', separator + 1);
  const relationshipType = entry.slice(separator + 1, next === -1 ? undefined : next);
  return relationshipType.length > 0 && relationshipType !== 'self'
    ? { entity_id: entry.slice(0, separator), relationship_type: relationshipType }
    : undefined;
};

const parseRelatedEntities = (raw: unknown[]): RelatedEntity[] => {
  const related: RelatedEntity[] = [];
  for (const entry of raw) {
    const member = parseRelatedEntity(entry);
    if (member) {
      related.push(member);
    }
  }
  return related;
};

export const parseEsqlResolutionScoreRow = (
  index: string,
  sampleSize: number,
  /** The query sorted inputs as strings behind a score key (pre-aggregation). */
  { sortKeyed = false }: { sortKeyed?: boolean } = {}
) => {
  const zetaValue = getRiemannZetaValue(sampleSize);
  return (row: unknown[]): ParsedResolutionScore => {
    const score = numberAt(row, 1);
    return {
      resolution_target_id: stringAt(row, 4),
      alert_count: numberAt(row, 0),
      score,
      normalized_score: score / zetaValue,
      risk_inputs: parseRiskInputs(valuesAt(row, 2), index, zetaValue, sortKeyed),
      related_entities: parseRelatedEntities(valuesAt(row, 3)),
    };
  };
};

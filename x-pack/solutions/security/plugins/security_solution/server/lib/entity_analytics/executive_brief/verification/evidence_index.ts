/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { Evidence } from '../signals/types';
import type { Fact } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { entityDisplayName } from '../entity_record';

/** Lookup tables over the evidence a brief was composed from. */
export interface EvidenceIndex {
  readonly evidence: Evidence;
  /** Entity Store records by EUID. */
  readonly entities: ReadonlyMap<string, Entity>;
  readonly facts: ReadonlyMap<number, Fact>;
  /** Matches the entities' EUIDs and names that contain digits, so they aren't read as numbers. */
  readonly identifierPattern?: RegExp;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildEvidenceIndex = (evidence: Evidence): EvidenceIndex => {
  const entities = new Map<string, Entity>(Object.entries(evidence.entities));
  const facts = new Map<number, Fact>(evidence.facts.map((fact) => [fact.id, fact]));
  const identifiers = unique(
    [...entities].flatMap(([euid, record]) => [
      euid,
      entityDisplayName(record, euid),
      record.entity?.name ?? '',
    ])
  )
    .filter((identifier) => /\d/.test(identifier))
    .sort((a, b) => b.length - a.length);
  return {
    evidence,
    entities,
    facts,
    ...(identifiers.length > 0
      ? { identifierPattern: new RegExp(identifiers.map(escapeRegExp).join('|'), 'gi') }
      : {}),
  };
};

/** The cited facts that are in the evidence. */
export const citedFacts = (index: EvidenceIndex, factIds: readonly number[]): Fact[] =>
  unique(factIds).flatMap((id) => {
    const fact = index.facts.get(id);
    return fact ? [fact] : [];
  });

/** Unique values, first occurrence wins. */
export const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, escapeRegExp, uniq } from 'lodash';
import type { Entity } from '@kbn/entity-store/common';
import type {
  Assessment,
  Brief,
  Fact,
  VerificationSummary,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { AssessmentKey } from '../../../../../common/entity_analytics/executive_brief/brief';
import {
  ASSESSMENT_KEYS,
  MAX_CITED_IDS,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import { entityDisplayName } from '../signals/engine/entity_record';
import type { Evidence } from '../signals';
import { checkGuardrails } from './guardrails';
import { checkMentions } from './mentions';
import { checkNumbers } from './numbers';

type VerificationCheck = keyof VerificationSummary['dropped'];

/** Matches any of `values`, longest first; undefined when there are none. */
export const alternationPattern = (values: readonly string[], flags = ''): RegExp | undefined => {
  if (values.length === 0) {
    return undefined;
  }
  const longestFirst = [...values].sort((a, b) => b.length - a.length);
  return new RegExp(longestFirst.map(escapeRegExp).join('|'), flags);
};

/** A copy of the brief that the rules change in place, the evidence, and what the rules found. */
export class CheckContext {
  readonly brief: Brief;
  /** Entity Store records by EUID. */
  readonly entities: ReadonlyMap<string, Entity>;
  readonly facts: ReadonlyMap<number, Fact>;
  /** The entities' EUIDs and names that contain digits, so they aren't read as numbers. */
  readonly identifierPattern?: RegExp;
  readonly dropped: VerificationSummary['dropped'] = {};
  lowered = 0;
  /** Problems only the model can fix, sent back once in a repair round-trip. */
  readonly structuralErrors: string[] = [];
  /** Clean-ups, for debug logging. */
  readonly notes: string[] = [];

  /** `range` is the window label (e.g. "7d"), whose number may be quoted. */
  constructor(brief: Brief, public readonly evidence: Evidence, public readonly range?: string) {
    this.brief = cloneDeep(brief);
    this.entities = new Map(Object.entries(evidence.entities));
    this.facts = new Map(evidence.facts.map((fact) => [fact.id, fact]));
    const identifiers = Object.entries(evidence.entities).flatMap(([euid, record]) => [
      euid,
      entityDisplayName(record, euid),
      record.entity?.name ?? '',
    ]);
    this.identifierPattern = alternationPattern(
      uniq(identifiers.filter((identifier) => /\d/.test(identifier))),
      'gi'
    );
  }

  /** The assessments not dropped yet, in display order. */
  assessments(): Array<[AssessmentKey, Assessment]> {
    return ASSESSMENT_KEYS.flatMap((key): Array<[AssessmentKey, Assessment]> => {
      const assessment = this.brief.assessments[key];
      return assessment ? [[key, assessment]] : [];
    });
  }

  /** The cited facts that are in the evidence. */
  citedFacts(factIds: readonly number[]): Fact[] {
    return uniq(factIds).flatMap((id) => this.facts.get(id) ?? []);
  }

  /** The fact ids the verdict rests on: those its remaining assessments cite. */
  verdictFactIds(): number[] {
    return uniq(this.assessments().flatMap(([, { factIds }]) => factIds));
  }

  /** Fails a claim: drops an assessment, or records a structural error for the verdict (no key). */
  fail(key: AssessmentKey | undefined, check: VerificationCheck, reason: string): void {
    if (key === undefined) {
      this.structuralErrors.push(`verdict: ${reason}.`);
      return;
    }
    if (!this.brief.assessments[key]) {
      return;
    }
    delete this.brief.assessments[key];
    this.dropped[check] = (this.dropped[check] ?? 0) + 1;
    this.notes.push(`dropped assessments.${key} (${check}): ${reason}`);
  }
}

/** Removes unknown and duplicate fact ids and caps the rest; the level cap lowers what's left unbacked. */
const cleanFactIds = (context: CheckContext): void => {
  for (const [, assessment] of context.assessments()) {
    const known = uniq(assessment.factIds).filter((id) => context.facts.has(id));
    assessment.factIds = known.slice(0, MAX_CITED_IDS);
  }
};

/** The checked brief; non-empty `structuralErrors` means it is not usable as is. */
export type VerifyBriefResult = Pick<CheckContext, 'brief' | 'structuralErrors' | 'notes'> & {
  summary: Omit<VerificationSummary, 'repaired'>;
};

/** Verifies an AI-written brief against the evidence it was written from; `range` is the window label. */
export const verifyBrief = (
  input: Brief,
  evidence: Evidence,
  range?: string
): VerifyBriefResult => {
  const context = new CheckContext(input, evidence, range);
  // In order: each rule sees the previous one's clean-ups and skips dropped assessments.
  checkMentions(context);
  cleanFactIds(context);
  checkNumbers(context);
  checkGuardrails(context);
  const { brief, dropped, lowered, structuralErrors, notes } = context;
  return { brief, summary: { dropped, lowered }, structuralErrors, notes };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeSymptomSlug, symptomSlugError } from '@kbn/nightshift-decision-trees';

const MAX_SLUG_WORDS = 5;

/** First value when a multi-valued keyword field is rendered as a comma-separated list. */
const firstValue = (value: string | undefined): string => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  return trimmed.split(',')[0]?.trim() ?? '';
};

/**
 * Turns a technique id or rule name into a slug the decision-tree contract accepts
 * (2–5 kebab-case words). A one-word id is prefixed so `T1059` becomes `technique-t1059`.
 * A long rule name keeps its first five words. Returns undefined when nothing usable remains.
 */
const toSymptomSlug = (value: string, singleWordPrefix: string): string | undefined => {
  const normalized = normalizeSymptomSlug(value);
  if (!normalized) {
    return undefined;
  }
  const words = normalized.split('-');
  const slug =
    words.length === 1
      ? normalizeSymptomSlug(`${singleWordPrefix} ${value}`)
      : words.slice(0, MAX_SLUG_WORDS).join('-');
  return symptomSlugError(slug) ? undefined : slug;
};

export interface DecisionTreeSymptomInput {
  subtechniqueId?: string;
  techniqueId?: string;
  ruleName?: string;
  spaceId: string;
}

export interface DecisionTreeSymptom {
  symptom: string;
  kiId: string;
}

/**
 * Picks the reusable symptom for one forensic run.
 *
 * Order is the most specific stable label first: sub-technique, technique, then rule name.
 * The host and the attack id are not candidates. Undefined means this run does not write a tree.
 */
export const deriveDecisionTreeSymptom = ({
  subtechniqueId,
  techniqueId,
  ruleName,
  spaceId,
}: DecisionTreeSymptomInput): DecisionTreeSymptom | undefined => {
  const symptom =
    toSymptomSlug(firstValue(subtechniqueId), 'technique') ??
    toSymptomSlug(firstValue(techniqueId), 'technique') ??
    toSymptomSlug(ruleName?.trim() ?? '', 'rule');
  if (!symptom) {
    return undefined;
  }

  const space =
    spaceId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'default';
  const kiId = `${space}:${symptom}`;
  if (kiId.length > 512) {
    return undefined;
  }
  return { symptom, kiId };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../../translations';

/** The two fields `_respond` requires, which are the two the fallback form draws. */
export const FIXED_DECISION_NAME = 'decision';
export const FIXED_RATIONALE_NAME = 'rationale';

/** Closed on purpose (security finding D2): a capitalized `"Dismiss"` once read as an approval. */
const DECISIONS = ['approve', 'dismiss'] as const;

const isDecision = (value: unknown): boolean => DECISIONS.some((decision) => decision === value);

const isRationale = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Which of the fallback form's two fields are unanswered, in the same
 * `fieldName -> message` shape `validateSchemaValues` returns, so the card
 * renders both branches' errors the same way.
 *
 * Stricter than the schema branch, and it has to be: there is no `inputSchema`
 * behind these controls to say that `decision` is a closed enum, so the check
 * is the enum itself. `rationale` is required non-empty after trim for a
 * dismissal too — there is no rationale-free path through a gate.
 */
export const validateFixedDecisionValues = (
  values: Record<string, unknown>
): Record<string, string> => ({
  ...(isDecision(values[FIXED_DECISION_NAME])
    ? {}
    : { [FIXED_DECISION_NAME]: i18n.REQUIRED_FIELD_ERROR }),
  ...(isRationale(values[FIXED_RATIONALE_NAME])
    ? {}
    : { [FIXED_RATIONALE_NAME]: i18n.REQUIRED_FIELD_ERROR }),
});

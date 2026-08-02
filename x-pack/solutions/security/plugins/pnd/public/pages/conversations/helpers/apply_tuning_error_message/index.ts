/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyQueryError, getErrorMessage } from '../../../../states';
import * as i18n from '../../translations';

/**
 * What went wrong when `_apply` refused, said in terms of what the analyst should
 * do about it.
 *
 * The three enumerated statuses mean genuinely different things and must never
 * collapse into one "could not apply" toast:
 *
 * | Status | Meaning | What to do |
 * |---|---|---|
 * | 400 | the change names a field outside `PND_TUNABLE_RULE_FIELDS` | **report it** — the model proposed a change that alters what the rule matches |
 * | 403 | the approver cannot write detection rules | escalate to someone who can; the gate is already resumed |
 * | 404 | no rule has that id — the model invented it | correct the prefilled id and apply again |
 *
 * Anything else falls back to the server's own message, because a 500 or a 503 is
 * not a claim about the rule.
 */
export const applyTuningErrorMessage = (error: unknown): string => {
  switch (classifyQueryError(error)) {
    case 'badRequest':
      return i18n.TUNING_APPLY_REJECTED;
    case 'forbidden':
      return i18n.TUNING_APPLY_FORBIDDEN;
    case 'notFound':
      return i18n.TUNING_APPLY_NOT_FOUND;
    default:
      return getErrorMessage(error, i18n.TUNING_APPLY_FAILED_FALLBACK);
  }
};

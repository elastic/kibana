/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Why a backtest side carries no count. The watch renders the literal `"inconclusive"` in place of a
 * number, which says *that* a side was not measured but not *why* — and the two reasons call for
 * different reactions from an approver, so they are separated here rather than collapsed into the
 * generic "no backtest available".
 *
 * These are authored in the browser because from Detection Watch v8 the workflow no longer writes a
 * `notMeasured` anchor: it writes two counts, and an unmeasured side is the absence of one. Leaving
 * that absence blank is exactly the silent gap the surfaces exist to close — a missing number reads
 * as "no change expected", which is the opposite of the truth.
 */
export const BACKTEST_INCONCLUSIVE = i18n.translate(
  'xpack.pnd.parseTuningProposal.backtestInconclusive',
  {
    defaultMessage:
      'The rule preview did not run or did not finish, so the effect of this query rewrite on alert volume was never measured. Inconclusive is not zero.',
  }
);

/**
 * ⚠️ **"action", not "proposal"**, per the 2026-08-12 design decision: user-facing copy says
 * *"action(s)", never "proposal(s)"*, because *"proposed" is a state of an action, not a separate
 * object*. This string was the last surviving user-facing "proposal" in the plugin, found by the
 * `kibana-phf4.34` conformance sweep. The message **id** keeps its `parseTuningProposal` bytes, which
 * is the same rule the `proposalRow` ids in `conversation_card/translations.ts` are kept under: a
 * renamed id retranslates a string whose meaning did not change.
 */
export const BACKTEST_NO_QUERY_CHANGE = i18n.translate(
  'xpack.pnd.parseTuningProposal.backtestNoQueryChange',
  {
    defaultMessage:
      'This action rewrites no rule query, so there was nothing to backtest: only a query change alters which documents the rule matches.',
  }
);

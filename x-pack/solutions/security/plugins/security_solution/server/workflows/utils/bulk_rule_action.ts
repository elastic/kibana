/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import {
  BulkEditActionSummary,
  NormalizedRuleError,
} from '../../../common/api/detection_engine/rule_management';
import type { BulkRuleSummaryOutput } from '../../../common/workflows/step_types/common/bulk_action_schemas';
import { toApiExecutionError } from './to_api_execution_error';

/**
 * Minimal schema over the slice of a `_bulk_action` response we consume: the
 * `summary` counters and the per-rule `errors`, reusing the generated
 * `BulkEditActionSummary` and `NormalizedRuleError` schemas. It intentionally
 * validates nothing else, so it tolerates the differing shapes of the response
 * body — notably the partial-failure `500`, which wraps the payload in the standard Kibana error envelope (`statusCode` /
 * `error`). Parsing the full response instead could reject an otherwise
 * recoverable partial success over a field we never read.
 */
const bulkRuleActionResponseSchema = z.object({
  attributes: z.object({
    summary: BulkEditActionSummary,
    errors: z.array(NormalizedRuleError).optional(),
  }),
});

/**
 * Builds the step output for a successful (2xx) bulk-action response.
 */
export const toBulkRuleActionOutput = (body: unknown): { output: BulkRuleSummaryOutput } => {
  const parsed = bulkRuleActionResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw toApiExecutionError(
      new Error('Unexpected bulk action response shape'),
      'bulk rule action'
    );
  }

  const { summary, errors } = parsed.data.attributes;
  return {
    output: {
      succeeded: summary.succeeded,
      failed: summary.failed,
      skipped: summary.skipped,
      total: summary.total,
      ...(errors && errors.length > 0 ? { errors } : {}),
    },
  };
};

/**
 * Handles an error thrown by the bulk-action call.
 *
 * `_bulk_action` responds with HTTP 500 whenever *any* selected rule fails —
 * even when others succeeded — and `callKibanaApi` surfaces that as a
 * `KibanaApiCallError` carrying the untruncated response body. The step is
 * treated as successful as long as at least one rule was changed or skipped
 * (already in the desired state): a partial `500` whose summary reports
 * `succeeded + skipped > 0` is recovered into a normal output (forwarding any
 * per-rule `errors`). If every selected rule failed — or the error is anything
 * other than a recoverable partial response — a normalized `ExecutionError` is
 * thrown so the whole step fails.
 *
 * @param error  The caught error.
 * @param action Short verb phrase for the failure message, e.g. `enable rules`.
 */
export const handleBulkRuleActionError = (
  error: unknown,
  action: string
): { output: BulkRuleSummaryOutput } => {
  if (error instanceof KibanaApiCallError && error.status === 500) {
    const parsed = bulkRuleActionResponseSchema.safeParse(error.body);
    if (parsed.success) {
      const { succeeded, skipped } = parsed.data.attributes.summary;
      if (succeeded + skipped > 0) {
        return toBulkRuleActionOutput(parsed.data);
      }
    }
  }
  throw toApiExecutionError(error, action);
};

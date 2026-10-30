/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { RECORD_RECOVERY_OUTCOME_TOOL_ID, recoveryOutcomeSchema } from '../round_verdict';

/**
 * The call is the record: it is stored as a step of the recovery round, and the post-round
 * workflow reads it from there. The tool itself writes nothing.
 */
export const createRecordRecoveryOutcomeTool = (): BuiltinToolDefinition<
  typeof recoveryOutcomeSchema
> => ({
  id: RECORD_RECOVERY_OUTCOME_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Record what an alert recovery showed about the root cause reported before it. Call it once, at the end of a round that follows an alert recovery, after updating the hypotheses; never in any other round. If you call it again, the last call replaces the earlier ones. ' +
    'verdict: "confirmed" only when the evidence shows the reported cause was removed and that removal ended the symptom; "contradicted" when the recovery shows the reported cause did not produce the symptom; "partly_supported" when it fits only part of it; "unresolved" when the recovery does not test the cause. ' +
    'resolved_by: "suppressed" when the alert only cleared because the rule was snoozed, muted, or in a maintenance window.',
  tags: ['investigation'],
  schema: recoveryOutcomeSchema,
  annotations: {
    title: 'Record Recovery Outcome',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (params) => ({
    results: [
      {
        type: ToolResultType.other as const,
        data: { text: `Recorded the recovery outcome: ${params.verdict}.` },
      },
    ],
  }),
});

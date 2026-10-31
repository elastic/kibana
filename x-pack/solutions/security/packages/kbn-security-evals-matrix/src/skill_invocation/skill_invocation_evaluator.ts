/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { createTraceBasedEvaluator, type Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

const VALID_SKILL_NAME = /^[a-zA-Z0-9_-]+$/;

/**
 * Security-owned counterpart of the platform `createSkillInvocationEvaluator` (same evaluator
 * name and 1 / 0 / null score shape). A skill counts as invoked when the agent
 *  - calls `load_skill` with the skill id as a whole quoted token (`{"skill":"<id>"}`, also when
 *    the argument is a `/<id>/SKILL.md` path), or
 *  - calls `filestore.read` on a `/<id>/SKILL.md` path.
 * The id is matched as a quoted token, so `alert-analysis-extra` does not satisfy `alert-analysis`.
 */
export function createSkillInvocationEvaluator({
  traceEsClient,
  log,
  skillName,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  skillName: string;
}): Evaluator {
  if (!VALID_SKILL_NAME.test(skillName)) {
    throw new Error(
      `Invalid skillName: "${skillName}" - only alphanumeric characters, hyphens, and underscores are allowed`
    );
  }

  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: `Skill Invoked (${skillName})`,
      direction: 'maximize',
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS
  total_spans = COUNT(*),
  skill_invoked = COUNT(
    CASE(
      (
        attributes.gen_ai.tool.name == "filestore.read"
          AND attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"
      )
      OR (
        attributes.gen_ai.tool.name == "load_skill"
          AND (
            attributes.gen_ai.tool.call.arguments LIKE "*\\"${skillName}\\"*"
            OR attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"
          )
      ),
      1,
      NULL
    )
  )`,
      extractResult: (response) => {
        const row = response.values[0];
        const totalSpansIndex = response.columns.findIndex(
          (column) => column.name === 'total_spans'
        );
        const skillInvokedIndex = response.columns.findIndex(
          (column) => column.name === 'skill_invoked'
        );

        if (totalSpansIndex === -1 || skillInvokedIndex === -1) {
          log.warning('Expected columns not found in trace query response');
          return null;
        }

        const totalSpans = row?.[totalSpansIndex] as number | undefined;
        const skillInvoked = row?.[skillInvokedIndex] as number | undefined;

        // Retry only while the trace itself is not yet indexed (OTLP -> ES lag). Once any span is
        // present, the skill-load span arrives in the same batch, so its absence is a real 0.
        if (!totalSpans) {
          return null;
        }

        return (skillInvoked ?? 0) > 0 ? 1 : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}

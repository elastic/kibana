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

export function createSecuritySkillInvocationEvaluator({
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

  // Tool-call arguments are exported under `attributes.elastic.tool.parameters`
  // (a JSON string, e.g. {"path":".../SKILL.md"}), NOT
  // `attributes.gen_ai.tool.call.arguments` — the latter is unmapped on both the
  // local EDOT trace index and the golden cluster, so any query referencing it
  // fails with verification_exception and the evaluator scores null/unavailable.
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
          AND attributes.elastic.tool.parameters LIKE "*/${skillName}/SKILL.md*"
      )
      OR (
        attributes.gen_ai.tool.name == "load_skill"
          AND attributes.elastic.tool.parameters LIKE "*${skillName}*"
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

        if (!totalSpans) {
          return null;
        }

        return (skillInvoked ?? 0) > 0 ? 1 : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}

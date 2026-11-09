/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceRound } from '@kbn/evals-plugin/server';
import { CORTEX_ENTITY_TYPES } from '../../../common/cortex';
import {
  stepsFromRound,
  type RawRoundResult,
  type RawRoundStep,
} from '../../investigation_round/round_loader';
import { extractWorkspaceReads } from '../../investigation_round/workspace_reads';

export interface CortexPageRead {
  /** Canonical page id, `cortex_<entityType>_<slug>`. */
  id: string;
  /** The page slug, without the id prefix. */
  slug: string;
  /** What the opening tool call returned; empty when the result carried no text. */
  content: string;
}

const toRawStep = ({
  tool_call_id: toolCallId,
  tool_id: toolId,
  arguments: args,
  result,
}: EvidenceRound['steps'][number]): RawRoundStep => ({
  type: 'tool_call',
  tool_id: toolId ?? 'unknown_tool',
  ...(toolCallId ? { tool_call_id: toolCallId } : {}),
  params: args && typeof args === 'object' ? (args as Record<string, unknown>) : {},
  ...(result !== undefined
    ? {
        results: (Array.isArray(result)
          ? result
          : [{ type: 'other', data: result }]) as RawRoundResult[],
      }
    : {}),
});

const slugFromId = (id: string): string => {
  const entityType = [...CORTEX_ENTITY_TYPES]
    .sort((a, b) => b.length - a.length)
    .find((type) => id.startsWith(`cortex_${type}_`));
  return entityType ? id.slice(`cortex_${entityType}_`.length) : id;
};

/**
 * The distinct Cortex pages the investigator opened, with the content each one returned.
 * Failed reads and writes don't count, and `INDEX.md` / `README.md` are not pages.
 */
export const collectCortexPageReads = (round: EvidenceRound): CortexPageRead[] => {
  const pages = new Map<string, CortexPageRead>();
  for (const step of stepsFromRound(round.steps.map(toRawStep))) {
    if (step.kind !== 'tool') {
      continue;
    }
    for (const id of extractWorkspaceReads([step]).cortexIds) {
      const existing = pages.get(id);
      if (!existing || (!existing.content && step.resultText)) {
        pages.set(id, { id, slug: slugFromId(id), content: step.resultText ?? '' });
      }
    }
  }
  return [...pages.values()];
};

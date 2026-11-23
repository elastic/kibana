/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { BatchEntry } from './detection_batch';
import {
  resolveWrittenDetectionsInputSchema,
  resolveWrittenDetectionsOutputSchema,
} from '../../common/workflows/steps/resolve_written_detections';
import {
  RuleEventsClient,
  type WrittenDetectionPair,
} from '../lib/significant_events/events/rule_events_client';

export const MAX_RUN_VERSIONS = 1_000;

interface ResolveStampRulesParams {
  batch: readonly BatchEntry[];
  reportedRuleUuids: readonly string[];
  runWrittenPairs: readonly WrittenDetectionPair[];
}

export interface ResolveStampRulesOutput {
  stamp_rule_uuids: string[];
  derived_count: number;
  unknown_reported_count: number;
}

export const resolveStampRules = ({
  batch,
  reportedRuleUuids,
  runWrittenPairs,
}: ResolveStampRulesParams): ResolveStampRulesOutput => {
  const batchPairs = new Set(
    batch.flatMap(({ detection_id: detectionId, rule_uuid: ruleUuid }) =>
      detectionId === undefined || ruleUuid === undefined ? [] : [`${detectionId}\u0000${ruleUuid}`]
    )
  );
  // A batch rule without a detection_id can never be derived from written events, so it stamps by report only.
  const batchRules = new Set(batch.flatMap(({ rule_uuid: ruleUuid }) => ruleUuid ?? []));
  const derivedRules = new Set(
    runWrittenPairs.flatMap(({ detection_id: detectionId, rule_uuid: ruleUuid }) =>
      batchPairs.has(`${detectionId}\u0000${ruleUuid}`) ? [ruleUuid] : []
    )
  );
  const reportedRules = new Set(reportedRuleUuids);
  const validatedReportedRules = new Set(
    [...reportedRules].filter((ruleUuid) => batchRules.has(ruleUuid))
  );
  const stampRuleUuids = [...batchRules].filter(
    (ruleUuid) => derivedRules.has(ruleUuid) || validatedReportedRules.has(ruleUuid)
  );

  return {
    stamp_rule_uuids: stampRuleUuids,
    derived_count: derivedRules.size,
    unknown_reported_count: [...reportedRules].filter((ruleUuid) => !batchRules.has(ruleUuid))
      .length,
  };
};

export const resolveWrittenDetectionsStepDefinition = ({ logger }: { logger: Logger }) =>
  createServerStepDefinition({
    id: 'significantEvents.resolveWrittenDetections',
    label: 'Resolve discovery detections written by this run',
    category: StepCategory.Elasticsearch,
    description:
      'Finds the batch detections recorded in events written by this discovery execution, then combines them with the agent-reported rules that have no event.',
    inputSchema: resolveWrittenDetectionsInputSchema,
    outputSchema: resolveWrittenDetectionsOutputSchema,
    handler: async (context) => {
      const {
        batch,
        reported_rule_uuids: reportedRuleUuids,
        workflow_execution_id: workflowExecutionId,
      } = context.input;
      const { workflow } = context.contextManager.getContext();
      const ruleEventsClient = new RuleEventsClient({
        esClient: context.contextManager.getScopedEsClient(),
        space: workflow.spaceId,
      });
      let runWrittenPairs: WrittenDetectionPair[] = [];
      let truncated = false;

      try {
        ({ pairs: runWrittenPairs, truncated } = await ruleEventsClient.findDetectionsWrittenByRun({
          workflowExecutionId,
          limit: MAX_RUN_VERSIONS,
        }));
      } catch (error) {
        logger.warn(
          `resolveWrittenDetections could not read events written by ${workflowExecutionId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      if (truncated) {
        logger.warn(
          `resolveWrittenDetections reached the ${MAX_RUN_VERSIONS} event version limit for ${workflowExecutionId}`
        );
      }

      const output = resolveStampRules({ batch, reportedRuleUuids, runWrittenPairs });

      if (output.derived_count === 0 && reportedRuleUuids.length > 0) {
        logger.debug(
          `resolveWrittenDetections derived no rules from events written by ${workflowExecutionId}, though the agent reported ${reportedRuleUuids.length}`
        );
      }

      return { output };
    },
  });

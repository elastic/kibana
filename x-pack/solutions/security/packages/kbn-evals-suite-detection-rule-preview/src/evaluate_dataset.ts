/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import {
  type DefaultEvaluators,
  type Evaluator,
  type EvaluationDataset,
  type EvalsExecutorClient,
  type ExperimentTask,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { DetectionRulePreviewChatClient } from './chat_client';
import { countPreviewAlerts } from './seed';
import type { PreviewConverseStep, PreviewConverseTaskOutput, PreviewExample } from './types';

const DETECTION_RULE_EDIT_SKILL = 'detection-rule-edit';
const RUN_RULE_PREVIEW_TOOL_ID = 'security.run_rule_preview';
const PREVIEW_ATTACHMENT_PREFIX = 'security-rule-preview-';

const extractPreviewIds = (steps: PreviewConverseStep[]): string[] =>
  steps
    .filter((step) => step.tool_id === RUN_RULE_PREVIEW_TOOL_ID)
    .flatMap((step) =>
      (step.results ?? [])
        .map((result) => result.data?.previewId)
        .filter((previewId): previewId is string => typeof previewId === 'string')
    );

const getPreviewToolCalls = (output: PreviewConverseTaskOutput): PreviewConverseStep[] =>
  output.steps.filter((step) => step.tool_id === RUN_RULE_PREVIEW_TOOL_ID);

const skillWasInvoked = (output: PreviewConverseTaskOutput): boolean =>
  output.steps
    .filter((step) => step.tool_id === 'load_skill')
    .some((step) => {
      const skillParam = step.params?.skill;
      if (skillParam === DETECTION_RULE_EDIT_SKILL) {
        return true;
      }
      return (step.results ?? []).some((result) => {
        const skill = result.data?.skill as { id?: string; name?: string } | undefined;
        return skill?.id === DETECTION_RULE_EDIT_SKILL || skill?.name === DETECTION_RULE_EDIT_SKILL;
      });
    });

const asTraceEvaluator = (
  evaluator: Evaluator
): Evaluator<PreviewExample, PreviewConverseTaskOutput> =>
  evaluator as unknown as Evaluator<PreviewExample, PreviewConverseTaskOutput>;

const createSkillInvokedEvaluator = (): Evaluator<PreviewExample, PreviewConverseTaskOutput> => ({
  name: 'SkillInvoked',
  kind: 'CODE',
  evaluate: async ({ output }) => ({
    score: skillWasInvoked(output) ? 1 : 0,
    metadata: { expectedSkill: DETECTION_RULE_EDIT_SKILL },
  }),
});

const createRunRulePreviewEvaluator = (): Evaluator<PreviewExample, PreviewConverseTaskOutput> => ({
  name: 'RunRulePreviewCalled',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const previewCalls = getPreviewToolCalls(output);
    return {
      score: previewCalls.length > 0 ? 1 : 0,
      metadata: { previewCalls: previewCalls.length },
    };
  },
});

const createPreviewUsesCommandEvaluator = (): Evaluator<
  PreviewExample,
  PreviewConverseTaskOutput
> => ({
  name: 'PreviewUsesCommand',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const previewCalls = getPreviewToolCalls(output);
    if (previewCalls.length === 0) {
      return { score: 0, metadata: { reason: 'No preview tool calls' } };
    }
    const firstParams = previewCalls[0].params;
    const usesCommand = typeof firstParams?.command === 'string' && firstParams.command.length > 0;
    const usesRuleObject = firstParams?.rule !== undefined;
    return {
      score: usesCommand && !usesRuleObject ? 1 : 0,
      metadata: {
        usesCommand,
        usesRuleObject,
        commandPreview:
          typeof firstParams?.command === 'string' ? firstParams.command.slice(0, 160) : undefined,
      },
    };
  },
});

const createPreviewAlertCountEvaluator = (): Evaluator<
  PreviewExample,
  PreviewConverseTaskOutput
> => ({
  name: 'PreviewAlertCount',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const minAlertCount = typeof metadata?.minAlertCount === 'number' ? metadata.minAlertCount : 1;
    const counts = output.previewAlertCounts ?? [];
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
    return {
      score: maxCount >= minAlertCount ? 1 : 0,
      metadata: { previewIds: output.previewIds, alertCounts: counts, minAlertCount },
    };
  },
});

const createFirstPreviewNoErrorEvaluator = (): Evaluator<
  PreviewExample,
  PreviewConverseTaskOutput
> => ({
  name: 'FirstPreviewNoError',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const previewCalls = getPreviewToolCalls(output);
    if (previewCalls.length === 0) {
      return { score: 0, metadata: { reason: 'No preview calls' } };
    }
    const firstResults = previewCalls[0].results ?? [];
    const errored = firstResults.some((result) => result.type === 'error');
    return {
      score: errored ? 0 : 1,
      metadata: { firstResultTypes: firstResults.map((result) => result.type) },
    };
  },
});

const createRenderAttachmentEvaluator = (): Evaluator<
  PreviewExample,
  PreviewConverseTaskOutput
> => ({
  name: 'RenderAttachment',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const rendered = output.message.includes('<render_attachment');
    const renderedPreview = output.message.includes(PREVIEW_ATTACHMENT_PREFIX);
    return {
      score: rendered && renderedPreview ? 1 : 0,
      metadata: { rendered, renderedPreview },
    };
  },
});

const buildTask =
  ({
    chatClient,
    esClient,
    connectorId,
  }: {
    chatClient: DetectionRulePreviewChatClient;
    esClient: EsClient;
    connectorId: string;
  }): ExperimentTask<PreviewExample, PreviewConverseTaskOutput> =>
  async ({ input }) => {
    if (!input) {
      throw new Error('Missing input for preview converse task');
    }
    const response = await chatClient.converse(input.prompt, connectorId);
    const previewIds = extractPreviewIds(response.steps);
    const previewAlertCounts: number[] = [];
    for (const previewId of previewIds) {
      previewAlertCounts.push(await countPreviewAlerts(esClient, previewId));
    }
    return {
      steps: response.steps,
      message: response.message,
      previewIds,
      previewAlertCounts,
    };
  };

export const createEvaluatePreviewDataset =
  ({
    evaluators,
    executorClient,
    chatClient,
    esClient,
    connectorId,
    log,
  }: {
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    chatClient: DetectionRulePreviewChatClient;
    esClient: EsClient;
    connectorId: string;
    log: ToolingLog;
  }) =>
  async ({ dataset }: { dataset: EvaluationDataset<PreviewExample> }) => {
    const traceEvaluators = evaluators.traceBasedEvaluators;
    const suiteEvaluators: Array<Evaluator<PreviewExample, PreviewConverseTaskOutput>> = [
      createSkillInvokedEvaluator(),
      createRunRulePreviewEvaluator(),
      createPreviewUsesCommandEvaluator(),
      createFirstPreviewNoErrorEvaluator(),
      createPreviewAlertCountEvaluator(),
      createRenderAttachmentEvaluator(),
      asTraceEvaluator(traceEvaluators.toolCalls),
      asTraceEvaluator(traceEvaluators.latency),
      asTraceEvaluator(traceEvaluators.inputTokens),
      asTraceEvaluator(traceEvaluators.outputTokens),
      asTraceEvaluator(traceEvaluators.cachedTokens),
    ];

    log.info(`Running detection-rule-preview dataset (${dataset.examples.length} cases)`);
    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: buildTask({ chatClient, esClient, connectorId }),
      },
      suiteEvaluators
    );
  };

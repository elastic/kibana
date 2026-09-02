/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { ChatModel } from '../../../../common/task/util/actions_client_chat';
import type { GraphNode } from '../types';

const ENHANCE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are assisting with migrating a Tines story to an Elastic Workflow.
Given the migration report (mapped/skipped steps and warnings), write a short markdown summary
(2-4 sentences) explaining what was translated, what was skipped, and any follow-up the user should take
(e.g. replace connector placeholders). Be concise and factual. Do not invent details.`,
  ],
  [
    'human',
    `Story title: {title}

Mapped steps ({mapped_count}):
{mapped_json}

Skipped steps ({skipped_count}):
{skipped_json}

Warnings:
{warnings_json}

Write the summary:`,
  ],
]);

interface GetEnhanceWithLlmNodeParams {
  model: ChatModel;
}

/**
 * LLM demo node: summarizes mapper report into an assistant comment.
 */
export const getEnhanceWithLlmNode = ({ model }: GetEnhanceWithLlmNodeParams): GraphNode => {
  return async (state) => {
    const report = state.report;
    if (!report) {
      return {};
    }

    // Skip LLM when there is nothing interesting to summarize
    if (report.skipped.length === 0 && report.warnings.length === 0) {
      return {
        llm_summary: `Fully mapped ${report.mapped.length} step(s) from Tines story "${state.original_workflow.title}".`,
      };
    }

    const chain = ENHANCE_PROMPT.pipe(model).pipe(new StringOutputParser());
    const llm_summary = await chain.invoke({
      title: state.original_workflow.title,
      mapped_count: String(report.mapped.length),
      skipped_count: String(report.skipped.length),
      mapped_json: JSON.stringify(report.mapped, null, 2),
      skipped_json: JSON.stringify(report.skipped, null, 2),
      warnings_json: JSON.stringify(report.warnings, null, 2),
    });

    return { llm_summary: llm_summary.trim() };
  };
};

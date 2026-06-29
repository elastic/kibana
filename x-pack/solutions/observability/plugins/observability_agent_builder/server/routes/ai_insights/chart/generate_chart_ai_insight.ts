/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, InferenceConnector } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import dedent from 'dedent';
import type { ChartDescriptionSeries } from '../../../../common/chart_description/types';
import { createAiInsightResult, type AiInsightResult } from '../types';

function getChartAiInsightSystemPrompt() {
  return dedent(`
    You are an accessibility assistant for Observability charts in Elastic Kibana.
    Summarize chart time series data for screen reader users using ONLY the provided JSON context.

    Output requirements:
    - Write 2-4 short plain-text paragraphs
    - No markdown, links, bullet lists, tables, or headings
    - Describe trends, peaks, troughs, and step changes using the timestamps and values in the data
    - When multiple series are present, explain how the current period compares to the comparison series
    - If a series has no numeric values, state that there is no data in the selected time range
    - Do not speculate or invent values that are not supported by the data
    - Be concise and direct; avoid flowery language
  `);
}

const buildUserPrompt = ({
  chartTitle,
  start,
  end,
  series,
}: {
  chartTitle: string;
  start?: string;
  end?: string;
  series: ChartDescriptionSeries[];
}) => {
  const chartContext = JSON.stringify(
    {
      chartTitle,
      start,
      end,
      series,
    },
    null,
    2
  );

  return dedent(`
    <ChartContext>
    ${chartContext}
    </ChartContext>

    Summarize this chart for a screen reader user. Each data point uses x as epoch milliseconds and y as the metric value (y may be null when data is missing).
  `);
};

export interface GenerateChartAiInsightParams {
  chartTitle: string;
  start?: string;
  end?: string;
  series: ChartDescriptionSeries[];
  inferenceClient: BoundInferenceClient;
  connector: InferenceConnector;
}

export function generateChartAiInsight({
  chartTitle,
  start,
  end,
  series,
  inferenceClient,
  connector,
}: GenerateChartAiInsightParams): AiInsightResult {
  const context = buildUserPrompt({ chartTitle, start, end, series });

  const events$ = inferenceClient.chatComplete({
    system: getChartAiInsightSystemPrompt(),
    messages: [
      {
        role: MessageRole.User,
        content: context,
      },
    ],
    stream: true,
  });

  return createAiInsightResult(context, connector, events$);
}

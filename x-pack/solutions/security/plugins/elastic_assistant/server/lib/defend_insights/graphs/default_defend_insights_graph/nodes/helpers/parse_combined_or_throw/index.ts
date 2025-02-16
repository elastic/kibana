/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DefendInsight, DefendInsightType } from '@kbn/elastic-assistant-common';

import { getSchema } from '../../generate/schema';
import { addTrailingBackticksIfNecessary } from '../add_trailing_backticks_if_necessary';
import { extractJson } from '../extract_json';

export const parseCombinedOrThrow = ({
  insightType,
  combinedResponse,
  generationAttempts,
  llmType,
  logger,
  nodeName,
}: {
  /** combined responses that maybe valid JSON */
  insightType: DefendInsightType;
  combinedResponse: string;
  generationAttempts: number;
  nodeName: string;
  llmType: string;
  logger?: Logger;
}): DefendInsight[] => {
  const timestamp = new Date().toISOString();

  const extractedJson = extractJson(addTrailingBackticksIfNecessary(combinedResponse));

  logger?.debug(
    () =>
      `${nodeName} node is parsing extractedJson (${llmType}) from attempt ${generationAttempts}`
  );

  const unvalidatedParsed = JSON.parse(extractedJson);

  logger?.debug(
    () =>
      `${nodeName} node is validating combined response (${llmType}) from attempt ${generationAttempts}`
  );

  const validatedResponse = getSchema({ type: insightType }).parse(unvalidatedParsed);

  logger?.debug(
    () =>
      `${nodeName} node successfully validated Defend insights response (${llmType}) from attempt ${generationAttempts}`
  );

  return [...validatedResponse.insights.map((insight) => ({ ...insight, timestamp }))];
};

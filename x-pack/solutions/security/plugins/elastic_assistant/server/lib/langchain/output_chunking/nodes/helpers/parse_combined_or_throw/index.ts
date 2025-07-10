/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ZodType } from '@kbn/zod';

import type { GraphInsightTypes } from '../../../../graphs';
import { addTrailingBackticksIfNecessary } from '../add_trailing_backticks_if_necessary';
import { extractJson } from '../extract_json';

export const parseCombinedOrThrow = <T extends GraphInsightTypes>({
  combinedResponse,
  generationAttempts,
  llmType,
  logger,
  nodeName,
  generationSchema,
}: {
  /** combined responses that maybe valid JSON */
  combinedResponse: string;
  generationAttempts: number;
  nodeName: string;
  llmType: string;
  logger?: Logger;
  generationSchema: ZodType<{ insights: T[] }>;
}): T[] => {
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

  const validatedResponse = generationSchema.parse(unvalidatedParsed);

  logger?.debug(
    () =>
      `${nodeName} node successfully validated insights response (${llmType}) from attempt ${generationAttempts}`
  );

  return [...validatedResponse.insights.map((insight) => ({ ...insight, timestamp }))];
};

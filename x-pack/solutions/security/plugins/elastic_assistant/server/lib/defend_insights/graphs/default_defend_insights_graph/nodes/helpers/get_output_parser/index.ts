/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredOutputParser } from 'langchain/output_parsers';
import type { DefendInsightType } from '@kbn/elastic-assistant-common';

import { DefendInsightsGenerationPrompts } from '../prompts/incompatible_antivirus';
import { getDefendInsightsSchema } from '../../generate/schema';

export function getOutputParser({
  type,
  prompts,
}: {
  type: DefendInsightType;
  prompts: DefendInsightsGenerationPrompts;
}) {
  return StructuredOutputParser.fromZodSchema(getDefendInsightsSchema({ type, prompts }));
}

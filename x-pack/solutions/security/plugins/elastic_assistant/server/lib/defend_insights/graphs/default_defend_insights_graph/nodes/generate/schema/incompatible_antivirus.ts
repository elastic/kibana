/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { StructuredOutputParser } from 'langchain/output_parsers';
// StructuredOutputParser.fromZodSchema

import { z } from '@kbn/zod';
import { DefendInsightsGenerationPrompts } from '../../helpers/prompts/incompatible_antivirus';

export function getDefendInsightsIncompatibleVirusGenerationSchema(
  prompts: DefendInsightsGenerationPrompts
) {
  return z.object({
    insights: z.array(
      z.object({
        group: z.string().describe(prompts.group),
        events: z
          .object({
            id: z.string().describe(prompts.eventsId),
            endpointId: z.string().describe(prompts.eventsEndpointId),
            value: z.string().describe(prompts.eventsValue),
          })
          .array()
          .describe(prompts.events),
      })
    ),
  });
}

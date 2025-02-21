/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { GenerationPrompts } from '../../helpers/prompts';

export const getAttackDiscoveriesGenerationSchema = (prompts: GenerationPrompts) =>
  z.object({
    insights: z
      .array(
        z.object({
          alertIds: z.string().array().describe(`The alert IDs that the insight is based on.`),
          detailsMarkdown: z.string().describe(prompts.detailsMarkdown),
          entitySummaryMarkdown: z.string().optional().describe(prompts.entitySummaryMarkdown),
          mitreAttackTactics: z.string().array().optional().describe(prompts.mitreAttackTactics),
          summaryMarkdown: z.string().describe(prompts.summaryMarkdown),
          title: z.string().describe(prompts.title),
        })
      )
      .describe(prompts.insights),
  });

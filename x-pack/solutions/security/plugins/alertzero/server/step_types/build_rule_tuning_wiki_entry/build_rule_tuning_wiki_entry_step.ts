/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  buildRuleTuningWikiEntryStepCommonDefinition,
  buildRuleTuningWikiEntryStepInputSchema,
} from '../../../common/step_types/build_rule_tuning_wiki_entry_step';
import { buildRuleTuningWikiEntry } from './build_rule_tuning_wiki_entry';

export const getBuildRuleTuningWikiEntryStepDefinition = (now: () => Date = () => new Date()) =>
  createServerStepDefinition({
    ...buildRuleTuningWikiEntryStepCommonDefinition,
    handler: async ({ input }) => {
      // The engine hands over the rendered input unparsed; parsing applies the bounds.
      const parsed = buildRuleTuningWikiEntryStepInputSchema.safeParse(input);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map(({ path, message }) => `${path.join('.') || '(root)'}: ${message}`)
          .join('; ');
        throw new ExecutionError({
          type: 'ValidationError',
          message: `Invalid step input: ${issues}`,
        });
      }
      return { output: buildRuleTuningWikiEntry(parsed.data, now()) };
    },
  });

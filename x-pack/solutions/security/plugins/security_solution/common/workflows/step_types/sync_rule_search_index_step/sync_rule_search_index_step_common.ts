/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';

export const SyncRuleSearchIndexStepId = 'security.syncRuleSearchIndex' as const;

export const syncRuleSearchIndexInputSchema = lazySchema(() => z.object({}));

export const syncRuleSearchIndexOutputSchema = lazySchema(() =>
  z.object({
    indexed: z.number().describe('Rules that were new or changed and were embedded again.'),
    deleted: z.number().describe('Documents of deleted rules that were removed.'),
    failed: z.number().describe('Rules that could not be embedded.'),
    total: z.number().describe('Rules in the space that the workflow user can read.'),
    tookMs: z.number(),
  })
);

export const syncRuleSearchIndexStepCommonDefinition: CommonStepDefinition<
  typeof syncRuleSearchIndexInputSchema,
  typeof syncRuleSearchIndexOutputSchema
> = {
  id: SyncRuleSearchIndexStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.syncRuleSearchIndex.label', {
    defaultMessage: 'Index detection rules for search by meaning',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.syncRuleSearchIndex.description',
    {
      defaultMessage:
        'Brings the rule search index of the current space up to date: new and changed rules are embedded, deleted rules are removed.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  exposure: 'managed_only',
  inputSchema: syncRuleSearchIndexInputSchema,
  outputSchema: syncRuleSearchIndexOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.syncRuleSearchIndex.documentation.details',
      {
        defaultMessage:
          'Reads the detection rules of the workflow space as the workflow user and indexes the rules that changed since the last run. Rules with the same update time and card version are skipped. The Rules page searches by meaning in a space after this step has indexed it once.',
      }
    ),
    examples: [
      `## Index the rules of this space
\`\`\`yaml
- name: sync_rule_search_index
  type: security.syncRuleSearchIndex
\`\`\``,
    ],
  },
};

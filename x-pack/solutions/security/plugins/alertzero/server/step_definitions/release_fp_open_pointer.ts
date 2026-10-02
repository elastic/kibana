/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createFpOpenPointerStore } from '../rule_dispositions/fp_open_pointer_store';
import type { FpCloseStepDependencies } from './fp_close_proposal';

export const RELEASE_FP_OPEN_POINTER_STEP_ID = 'alertzero.releaseFpOpenPointer';

/**
 * Removes the rule's open-proposal pointer once the proposal it leads to has been decided or has
 * expired, so a later batch raises a proposal without first waiting on a proposal that is gone.
 * Only the pointer of the given Investigation is removed: a pointer that already leads elsewhere
 * belongs to a newer proposal.
 */
export const releaseFpOpenPointerStepDefinition = ({
  isPointerStoreAvailable,
}: Pick<FpCloseStepDependencies, 'isPointerStoreAvailable'>) =>
  createServerStepDefinition({
    id: RELEASE_FP_OPEN_POINTER_STEP_ID,
    label: i18n.translate('xpack.alertzero.steps.releaseFpOpenPointer.label', {
      defaultMessage: 'Release false positive closure pointer',
    }),
    description: i18n.translate('xpack.alertzero.steps.releaseFpOpenPointer.description', {
      defaultMessage:
        "Removes a detection rule's open closure proposal pointer when it still leads to the given Investigation.",
    }),
    category: StepCategory.Kibana,
    inputSchema: z.object({
      rule_id: z.string().min(1).max(512).describe('Id of the detection rule.'),
      conversation_id: z
        .string()
        .min(1)
        .max(512)
        .describe('Investigation whose closure proposal was settled.'),
    }),
    outputSchema: z.object({
      released: z
        .boolean()
        .describe('True when the pointer led to the Investigation and was removed.'),
    }),
    handler: async (context) => {
      if (!isPointerStoreAvailable) {
        return { output: { released: false } };
      }

      const { rule_id: ruleId, conversation_id: conversationId } = context.input;
      const { spaceId } = context.contextManager.getContext().workflow;
      const store = createFpOpenPointerStore({
        esClient: context.contextManager.getScopedEsClient(),
        spaceId,
        signal: context.abortSignal,
      });

      const stored = await store.get(ruleId);
      if (!stored || stored.pointer.conversationId !== conversationId) {
        return { output: { released: false } };
      }

      const result = await store.release(ruleId, stored);
      return { output: { released: result === 'released' } };
    },
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { NightshiftAutomationBudgetAttributes } from '../lib/automations/types';
import { NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE } from '../saved_objects/automation_budget_saved_object';

type GetBudgetSoClient = (spaceId: string) => SavedObjectsClientContract;

const inputSchema = z.object({
  automation_id: z.string().min(1).describe('The automation whose budget should be checked'),
  daily_limit: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Maximum dispatches allowed per day. Omit or 0 = unlimited.'),
});

const outputSchema = z.object({
  allowed: z.boolean().describe('Whether the dispatch is within budget'),
  reason: z.string().optional().describe('Human-readable reason when allowed is false'),
});

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function budgetSoId(automationId: string, date: string): string {
  return `${automationId}-${date}`;
}

async function incrementBudget(
  soClient: SavedObjectsClientContract,
  automationId: string,
  date: string
): Promise<void> {
  const id = budgetSoId(automationId, date);

  await pRetry(
    async () => {
      let existing:
        | { attributes: NightshiftAutomationBudgetAttributes; version?: string }
        | undefined;
      try {
        const got = await soClient.get<NightshiftAutomationBudgetAttributes>(
          NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
          id
        );
        existing = { attributes: got.attributes, version: got.version };
      } catch (err) {
        if (err?.output?.statusCode !== 404) {
          throw new AbortError(err);
        }
      }

      if (!existing) {
        try {
          await soClient.create<NightshiftAutomationBudgetAttributes>(
            NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
            { automationId, date, used: 1 },
            { id }
          );
          return;
        } catch (createErr) {
          if (createErr?.output?.statusCode !== 409) {
            throw new AbortError(createErr);
          }
          // Another process created it concurrently — retry the get+update path.
          throw createErr;
        }
      }

      await soClient.update<NightshiftAutomationBudgetAttributes>(
        NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
        id,
        { used: existing.attributes.used + 1 },
        { version: existing.version }
      );
    },
    { retries: 4, minTimeout: 50, maxTimeout: 200, factor: 2 }
  );
}

export const checkBudgetStepDefinition = (getBudgetSoClient: GetBudgetSoClient) =>
  createServerStepDefinition({
    id: 'nightshift.checkBudget',
    label: 'Check Automation Budget',
    category: StepCategory.FlowControl,
    description:
      'Checks whether the automation has remaining dispatch budget for today. Returns allowed=false if the daily limit is reached; increments the counter otherwise.',
    inputSchema,
    outputSchema,
    handler: async (context) => {
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const soClient = getBudgetSoClient(spaceId);
      const input = inputSchema.parse(context.input);

      // 0 or absent = unlimited
      if (!input.daily_limit) {
        return { output: { allowed: true } };
      }

      const today = todayUtc();
      const id = budgetSoId(input.automation_id, today);

      let current: NightshiftAutomationBudgetAttributes | undefined;
      try {
        const got = await soClient.get<NightshiftAutomationBudgetAttributes>(
          NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
          id
        );
        current = got.attributes;
      } catch (err) {
        if (err?.output?.statusCode !== 404) {
          throw err;
        }
      }

      if (current && current.used >= input.daily_limit) {
        return {
          output: {
            allowed: false,
            reason: `Daily limit of ${input.daily_limit} reached`,
          },
        };
      }

      await incrementBudget(soClient, input.automation_id, today);
      return { output: { allowed: true } };
    },
  });

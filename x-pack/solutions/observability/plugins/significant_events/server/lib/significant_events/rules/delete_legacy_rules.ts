/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';

/**
 * Cleanup-only access to Alerting v1 rules retained for the time-boxed reset endpoint.
 * This must not be used to create, update, or read Significant Events at runtime.
 */
export const deleteLegacyRules = async (
  rulesClient: RulesClient,
  ruleIds: string[]
): Promise<void> => {
  const failures: Array<{ id: string; error: unknown }> = [];

  for (const id of ruleIds) {
    try {
      await rulesClient.delete({ id });
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 404) {
        continue;
      }
      failures.push({ id, error });
    }
  }

  if (failures.length > 0) {
    const detail = failures
      .map(({ id, error }) => `${id}: ${error instanceof Error ? error.message : String(error)}`)
      .join('; ');
    throw new AggregateError(
      failures.map(({ error }) => error),
      `Failed to delete ${failures.length} legacy rule(s): ${detail}`
    );
  }
};

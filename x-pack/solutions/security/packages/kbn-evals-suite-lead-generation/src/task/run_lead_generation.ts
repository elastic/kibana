/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { LeadGenerationClient } from '../clients/lead_generation_client';
import type { LeadGenerationTaskInput, LeadGenerationTaskOutput } from '../types';

export const runLeadGeneration = async ({
  leadGenerationClient,
  connectorId,
  input,
  log,
}: {
  leadGenerationClient: LeadGenerationClient;
  connectorId: string;
  input: LeadGenerationTaskInput;
  log: ToolingLog;
}): Promise<LeadGenerationTaskOutput> => {
  try {
    const { leads, executionUuid } = await leadGenerationClient.generateAndWait({
      connectorId,
      maxLeads: input.maxLeads,
    });

    log.info(
      `[runLeadGeneration] Pipeline complete — ${leads.length} lead(s) generated (executionUuid=${executionUuid})`
    );

    return {
      leads,
      raw: {
        executionUuid,
        total: leads.length,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error(new Error(`[runLeadGeneration] Failed: ${message}`, { cause: e as Error }));
    return { leads: null, errors: [message] };
  }
};

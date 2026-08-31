/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { LeadGenerationClient } from '../clients/lead_generation_client';
import type { LeadGenerationTaskOutput } from '../types';

export const runLeadGeneration = async ({
  leadGenerationClient,
  connectorId,
  log,
}: {
  leadGenerationClient: LeadGenerationClient;
  connectorId: string;
  log: ToolingLog;
}): Promise<LeadGenerationTaskOutput> => {
  try {
    const { leads, executionUuid } = await leadGenerationClient.generateAndWait({
      connectorId,
    });

    log.info(
      `[runLeadGeneration] Pipeline complete — ${leads.length} lead(s) generated (executionUuid=${executionUuid})`
    );

    if (leads.length === 0) {
      log.warning(
        '[runLeadGeneration] No leads were generated — this likely means the entity store had no ' +
          'qualifying entities. Evaluators score this "ok_no_leads" (still passing), but it validates ' +
          'that the pipeline ran, not that lead quality is good.'
      );
    }

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';

import { AnonymizedAlertSchema, ApiConfigSchema, AttackDiscoverySchema } from './shared_schemas';

export const PersistDiscoveriesStepTypeId = 'security.attack-discovery.persistDiscoveries';

export const PersistDiscoveriesInputSchema = z.object({
  alerts_context_count: z.number().int(),
  anonymized_alerts: z.array(AnonymizedAlertSchema),
  api_config: ApiConfigSchema,
  attack_discoveries: z.array(AttackDiscoverySchema),
  connector_name: z.string().optional(),
  enable_field_rendering: z.boolean().optional().default(true),
  generation_uuid: z.string(),
  replacements: z.record(z.string(), z.string()).optional(),
  /**
   * The execution source. When 'scheduled', persistence is skipped because the
   * alerting-framework executor (workflowExecutor) writes directly to the
   * scheduled alerts index via alertsClient — writing here too would cause
   * scheduled discoveries to appear in the ad-hoc index and leak onto the
   * main Attack Discovery page.
   */
  source: z.string().optional(),
  with_replacements: z.boolean().optional().default(false),
});

export const PersistDiscoveriesOutputSchema = z.object({
  duplicates_dropped_count: z.number().int(),
  persisted_discoveries: z.array(z.unknown()),
});

export const PersistDiscoveriesStepCommonDefinition: CommonStepDefinition<
  typeof PersistDiscoveriesInputSchema,
  typeof PersistDiscoveriesOutputSchema
> = {
  category: StepCategory.Kibana,
  description: i18n.translate('xpack.discoveries.workflowSteps.persistDiscoveries.description', {
    defaultMessage:
      'Write validated Attack Discoveries as alerts to the Attack Discovery alerts index with deduplication',
  }),
  id: PersistDiscoveriesStepTypeId,
  inputSchema: PersistDiscoveriesInputSchema,
  label: i18n.translate('xpack.discoveries.workflowSteps.persistDiscoveries.label', {
    defaultMessage: 'Attack Discovery: Persist Discoveries',
  }),
  outputSchema: PersistDiscoveriesOutputSchema,
};

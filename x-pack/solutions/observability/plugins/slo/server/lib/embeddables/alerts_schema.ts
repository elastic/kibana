/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { z } from '@kbn/zod';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { SLO_ALERTS_SUPPORTED_TRIGGERS } from '../../../common/embeddables/alerts/constants';

const sloItemSchema = z
  .object({
    slo_id: z.string().meta({ description: 'SLO ID' }),
    slo_instance_id: z.string().default('*').meta({ description: 'SLO instance ID' }),
  })
  .strict();

const AlertsCustomSchema = z
  .object({
    slos: z
      .array(sloItemSchema)
      .max(100)
      .default([])
      .meta({ description: 'List of SLOs to display alerts for' }),
  })
  .strict();

export const getAlertsEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return z
    .object({
      ...AlertsCustomSchema.shape,
      ...getDrilldownsSchema(SLO_ALERTS_SUPPORTED_TRIGGERS).shape,
      ...serializedTitlesSchema.shape,
    })
    .strict()
    .meta({
      id: 'slo-alerts-embeddable',
      description: 'SLO Alerts embeddable schema',
    });
};

export type SloItem = z.output<typeof sloItemSchema>;
export type AlertsCustomState = z.output<typeof AlertsCustomSchema>;
export type AlertsEmbeddableState = z.output<ReturnType<typeof getAlertsEmbeddableSchema>>;

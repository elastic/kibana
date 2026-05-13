/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { z } from '@kbn/zod';
import { ALL_VALUE } from '@kbn/slo-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { SLO_BURN_RATE_SUPPORTED_TRIGGERS } from '../../../common/embeddables/burn_rate/constants';

const BurnRateCustomSchema = z.object({
  slo_id: z.string().meta({
    description: 'The ID of the SLO to display the burn rate for',
  }),
  slo_instance_id: z.string().default(ALL_VALUE).meta({
    description:
      'ID of the SLO instance. Set when the SLO uses group_by; identifies which instance to show. Defaults to * (all instances).',
  }),
  duration: z.string().meta({
    description: 'Duration for the burn rate chart in the format [value][unit], e.g. 5m, 3h, or 6d',
  }),
});

export const getBurnRateEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return z
    .object({
      ...BurnRateCustomSchema.shape,
      ...getDrilldownsSchema(SLO_BURN_RATE_SUPPORTED_TRIGGERS).shape,
      ...serializedTitlesSchema.shape,
    })
    .meta({
      id: 'slo-burn-rate-embeddable',
      description: 'SLO Burn Rate embeddable schema',
    });
};

export type BurnRateCustomState = z.output<typeof BurnRateCustomSchema>;
export type BurnRateEmbeddableState = z.output<ReturnType<typeof getBurnRateEmbeddableSchema>>;

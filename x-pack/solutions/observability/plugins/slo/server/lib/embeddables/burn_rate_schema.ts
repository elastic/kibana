/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { SLO_BURN_RATE_SUPPORTED_TRIGGERS } from '../../../common/embeddables/burn_rate/constants';

const BurnRateCustomSchema = schema.object({
  slo_id: schema.string({
    meta: { description: 'The ID of the SLO to display the burn rate for' },
  }),
  slo_instance_id: schema.string({
    defaultValue: ALL_VALUE,
    meta: {
      description:
        'ID of the SLO instance. Set when the SLO uses group_by; identifies which instance to show. Defaults to * (all instances).',
    },
  }),
  duration: schema.string({
    meta: {
      description:
        'Duration for the burn rate chart in the format [value][unit], e.g. 5m, 3h, or 6d',
    },
  }),
});

export const getBurnRateEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return schema.object(
    {
      ...BurnRateCustomSchema.getPropSchemas(),
      ...getDrilldownsSchema(SLO_BURN_RATE_SUPPORTED_TRIGGERS).getPropSchemas(),
      ...serializedTitlesSchema.getPropSchemas(),
    },
    {
      meta: {
        id: 'slo-burn-rate-embeddable',
        description: 'SLO Burn Rate embeddable schema',
      },
    }
  );
};

export type BurnRateCustomState = TypeOf<typeof BurnRateCustomSchema>;
export type BurnRateEmbeddableState = TypeOf<ReturnType<typeof getBurnRateEmbeddableSchema>>;

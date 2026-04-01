/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { SLO_ALERTS_SUPPORTED_TRIGGERS } from '../../../common/embeddables/alerts/constants';

const sloItemSchema = schema.object({
  slo_id: schema.string({ meta: { description: 'SLO ID' } }),
  slo_instance_id: schema.string({
    defaultValue: '*',
    meta: { description: 'SLO instance ID' },
  }),
});

const AlertsCustomSchema = schema.object({
  slos: schema.arrayOf(sloItemSchema, {
    defaultValue: [],
    maxSize: 100,
    meta: { description: 'List of SLOs to display alerts for' },
  }),
});

export const getAlertsEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return schema.object(
    {
      ...AlertsCustomSchema.getPropSchemas(),
      ...getDrilldownsSchema(SLO_ALERTS_SUPPORTED_TRIGGERS).getPropSchemas(),
      ...serializedTitlesSchema.getPropSchemas(),
    },
    {
      meta: {
        id: 'slo-alerts-embeddable',
        description: 'SLO Alerts embeddable schema',
      },
    }
  );
};

export type SloItem = TypeOf<typeof sloItemSchema>;
export type AlertsCustomState = TypeOf<typeof AlertsCustomSchema>;
export type AlertsEmbeddableState = TypeOf<ReturnType<typeof getAlertsEmbeddableSchema>>;

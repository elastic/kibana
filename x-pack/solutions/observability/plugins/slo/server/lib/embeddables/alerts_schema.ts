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
  id: schema.string({ meta: { description: 'SLO ID' } }),
  instanceId: schema.string({ meta: { description: 'SLO instance ID' } }),
  name: schema.string({ meta: { description: 'SLO name' } }),
  groupBy: schema.string({ meta: { description: 'Group by field' } }),
});

const AlertsCustomSchema = schema.object({
  slos: schema.arrayOf(sloItemSchema, {
    defaultValue: [],
    meta: { description: 'List of SLOs to display alerts for' },
  }),
  showAllGroupByInstances: schema.boolean({
    defaultValue: false,
    meta: { description: 'Whether to show all group-by instances' },
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

export type AlertsCustomState = TypeOf<typeof AlertsCustomSchema>;
export type AlertsEmbeddableState = TypeOf<ReturnType<typeof getAlertsEmbeddableSchema>>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  RUM_ALERT_NOTIFICATIONS_SO_ID,
  RUM_ALERT_NOTIFICATIONS_SO_TYPE,
} from '../../common/rum_alerts';

const attributesSchema = schema.object({
  workflowId: schema.string({ maxLength: 128 }),
  policyId: schema.string({ maxLength: 128 }),
  connectorId: schema.string({ maxLength: 128 }),
  to: schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 20 }),
  updatedAt: schema.string({ maxLength: 40 }),
});

export interface RumAlertNotificationsAttributes {
  workflowId: string;
  policyId: string;
  connectorId: string;
  to: string[];
  updatedAt: string;
}

export const rumAlertNotificationsSavedObjectType: SavedObjectsType = {
  name: RUM_ALERT_NOTIFICATIONS_SO_TYPE,
  hidden: false,
  hiddenFromHttpApis: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      workflowId: { type: 'keyword', ignore_above: 128 },
      policyId: { type: 'keyword', ignore_above: 128 },
      connectorId: { type: 'keyword', ignore_above: 128 },
      updatedAt: { type: 'date' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
        create: attributesSchema,
      },
    },
  },
};

export { RUM_ALERT_NOTIFICATIONS_SO_ID, RUM_ALERT_NOTIFICATIONS_SO_TYPE };

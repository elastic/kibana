/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { createInventoryModel } from '../shared/create_inventory_model';
export const awsRDS = createInventoryModel('awsRDS', {
  displayName: i18n.translate('xpack.metricsData.inventoryModels.awsRDS.displayName', {
    defaultMessage: 'RDS Databases',
  }),
  singularDisplayName: i18n.translate(
    'xpack.metricsData.inventoryModels.awsRDS.singularDisplayName',
    {
      defaultMessage: 'RDS Database',
    }
  ),
  requiredIntegration: 'aws',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: false,
    uptime: false,
  },
  metrics,
  fields: {
    id: 'aws.rds.db_instance.arn',
    name: 'aws.rds.db_instance.identifier',
  },
  nodeFilter: () => [{ term: { 'event.module': 'aws' } }],
});

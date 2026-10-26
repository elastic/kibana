/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { createInventoryModel } from '../shared/create_inventory_model';

export const awsEC2 = createInventoryModel('awsEC2', {
  displayName: i18n.translate('xpack.metricsData.inventoryModels.awsEC2.displayName', {
    defaultMessage: 'EC2 Instances',
  }),
  singularDisplayName: i18n.translate(
    'xpack.metricsData.inventoryModels.awsEC2.singularDisplayName',
    {
      defaultMessage: 'EC2 Instance',
    }
  ),
  requiredIntegration: 'aws',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  metrics,
  fields: {
    id: 'cloud.instance.id',
    name: 'cloud.instance.name',
    ip: 'aws.ec2.instance.public.ip',
  },
  nodeFilter: () => [{ term: { 'event.module': 'aws' } }],
});

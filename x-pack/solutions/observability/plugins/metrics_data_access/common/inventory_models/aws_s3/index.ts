/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { createInventoryModel } from '../shared/create_inventory_model';

export const awsS3 = createInventoryModel('awsS3', {
  displayName: i18n.translate('xpack.metricsData.inventoryModels.awsS3.displayName', {
    defaultMessage: 'S3 Buckets',
  }),
  singularDisplayName: i18n.translate(
    'xpack.metricsData.inventoryModels.awsS3.singularDisplayName',
    {
      defaultMessage: 'S3 Bucket',
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
    id: 'aws.s3.bucket.name',
    name: 'aws.s3.bucket.name',
  },
  nodeFilter: () => [{ term: { 'event.module': 'aws' } }],
});

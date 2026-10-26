/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { createInventoryModel } from '../shared/create_inventory_model';

export const container = createInventoryModel('container', {
  displayName: i18n.translate('xpack.metricsData.inventoryModel.container.displayName', {
    defaultMessage: 'Docker Containers',
  }),
  singularDisplayName: i18n.translate(
    'xpack.metricsData.inventoryModel.container.singularDisplayName',
    {
      defaultMessage: 'Docker Container',
    }
  ),
  requiredIntegration: 'docker',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  fields: {
    id: 'container.id',
    name: 'container.name',
    ip: 'container.ip_address',
  },
  metrics,
  nodeFilter: () => [
    {
      bool: {
        should: [
          { term: { 'event.module': 'docker' } },
          { term: { 'event.module': 'kubernetes' } },
          { term: { 'event.module': 'system' } },
        ],
        minimum_should_match: 1,
      },
    },
  ],
});

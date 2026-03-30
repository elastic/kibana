/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import { metrics } from './metrics';
import { createInventoryModel } from '../shared/create_inventory_model';
import type { DataSchemaFormat } from '../types';
import { DATASTREAM_DATASET, KUBELET_STATS_RECEIVER_OTEL } from '../../constants';

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
  requiredIntegration: {
    beats: 'docker',
    otel: 'kubeletstatsreceiver.otel',
  },
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
  nodeFilter: (args?: { schema?: DataSchemaFormat }): estypes.QueryDslQueryContainer[] => {
    const { schema } = args ?? {};
    if (!schema) {
      return [];
    }

    return [
      {
        bool:
          schema === 'ecs'
            ? {
                should: [
                  { term: { 'event.module': 'docker' } },
                  { term: { 'event.module': 'kubernetes' } },
                  { term: { 'event.module': 'system' } },
                ],
                minimum_should_match: 1,
              }
            : {
                filter: [
                  {
                    term: {
                      [DATASTREAM_DATASET]: KUBELET_STATS_RECEIVER_OTEL,
                    },
                  },
                  {
                    exists: {
                      field: 'container.id',
                    },
                  },
                ],
              },
      },
    ];
  },
});

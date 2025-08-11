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
import {
  DATASTREAM_DATASET,
  EVENT_MODULE,
  HOST_METRICS_RECEIVER_OTEL,
  METRICSET_MODULE,
  SYSTEM_INTEGRATION,
} from '../../constants';

export const host = createInventoryModel('host', {
  displayName: i18n.translate('xpack.metricsData.inventoryModel.host.displayName', {
    defaultMessage: 'Hosts',
  }),
  singularDisplayName: i18n.translate(
    'xpack.metricsData.inventoryModels.host.singularDisplayName',
    {
      defaultMessage: 'Host',
    }
  ),
  requiredIntegration: {
    beats: 'system',
    otel: 'hostmetricsreceiver.otel',
  },
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  fields: {
    id: 'host.name',
    name: 'host.name',
    os: 'host.os.name',
    ip: 'host.ip',
    cloudProvider: 'cloud.provider',
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
                  {
                    term: {
                      [EVENT_MODULE]: SYSTEM_INTEGRATION,
                    },
                  },
                  {
                    term: {
                      [METRICSET_MODULE]: SYSTEM_INTEGRATION,
                    },
                  },
                ],
                minimum_should_match: 1,
              }
            : {
                filter: [
                  {
                    term: {
                      [DATASTREAM_DATASET]: HOST_METRICS_RECEIVER_OTEL,
                    },
                  },
                ],
              },
      },
    ];
  },
});

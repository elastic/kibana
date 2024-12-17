/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '../../types';

export const kpiUniquePrivateIpsDestinationMetricLensAttributes: LensAttributes = {
  description: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          'cea37c70-8f91-43bf-b9fe-72d8c049f6a3': {
            columnOrder: ['bd17c23e-4f83-4108-8005-2669170d064b'],
            columns: {
              'bd17c23e-4f83-4108-8005-2669170d064b': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: '',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'destination.ip',
                filter: {
                  language: 'kuery',
                  query:
                    '"destination.ip": "10.0.0.0/8" or "destination.ip": "192.168.0.0/16" or "destination.ip": "172.16.0.0/12" or "destination.ip": "fd00::/8"',
                },
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
    filters: [],
    query: {
      language: 'kuery',
      query: '',
    },
    visualization: {
      accessor: 'bd17c23e-4f83-4108-8005-2669170d064b',
      layerId: 'cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
      layerType: 'data',
    },
  },
  title: '[Network] Unique private IPs - destination metric',
  visualizationType: 'lnsLegacyMetric',
  references: [
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
      type: 'index-pattern',
    },
  ],
} as LensAttributes;

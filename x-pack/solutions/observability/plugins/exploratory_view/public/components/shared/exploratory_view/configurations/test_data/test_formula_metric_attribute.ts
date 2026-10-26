/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FINAL_SUMMARY_KQL } from '../synthetics/single_metric_config';
import { mockDataView } from '../../rtl_helpers';

export const sampleMetricFormulaAttribute = {
  description: '',
  references: [],
  state: {
    adHocDataViews: { [mockDataView.title]: mockDataView.toSpec(false) },
    internalReferences: [
      {
        id: 'apm-*',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'apm-*',
        name: 'indexpattern-datasource-layer-layer0',
        type: 'index-pattern',
      },
    ],
    datasourceStates: {
      formBased: {
        layers: {
          layer0: {
            columnOrder: ['layer-0-column-1'],
            columns: {
              'layer-0-column-1': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: FINAL_SUMMARY_KQL,
                },
                isBucketed: false,
                label: 'Availability',
                operationType: 'formula',
                params: {
                  format: {
                    id: 'percent',
                    params: {
                      decimals: 3,
                    },
                  },
                  formula: "1- (count(kql='summary.down > 0') / count())",
                  isFormulaBroken: false,
                },
                references: [],
              },
            },
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
      accessor: 'layer-0-column-1',
      colorMode: 'Labels',
      layerId: 'layer0',
      layerType: 'data',
      palette: {
        name: 'custom',
        params: {
          colorStops: [
            {
              color: '#cc5642',
              stop: 0.8,
            },
            {
              color: '#d6bf57',
              stop: 0.9,
            },
            {
              color: '#209280',
              stop: 0.95,
            },
          ],
          continuity: 'above',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 1,
          rangeMin: 0,
          rangeType: 'number',
          reverse: false,
          steps: 3,
          stops: [
            {
              color: '#cc5642',
              stop: 0.9,
            },
            {
              color: '#d6bf57',
              stop: 0.95,
            },
            {
              color: '#209280',
              stop: 1.9903347477604902,
            },
          ],
        },
        type: 'palette',
      },
      size: 's',
      titlePosition: 'bottom',
    },
  },
  title: 'Prefilled from exploratory view app',
  visualizationType: 'lnsLegacyMetric',
};

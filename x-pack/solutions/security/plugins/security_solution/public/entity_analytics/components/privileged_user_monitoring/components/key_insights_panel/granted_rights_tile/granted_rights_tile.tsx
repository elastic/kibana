/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';

import { VisualizationEmbeddable } from '../../../../../../common/components/visualization_actions/visualization_embeddable';

interface Props {
  timerange: {
    from: string;
    to: string;
  };
}

export const grantedRightsLensAttributes: LensAttributes = {
  title: 'Granted rights',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: 'layer1',
      layerType: 'data',
      metricAccessor: 'metric_count',
      trendlineLayerId: 'layer2',
      trendlineLayerType: 'metricTrendline',
      trendlineTimeAccessor: 'timestamp',
      trendlineMetricAccessor: 'metric_count_trend',
    },
    query: {
      query: 'event_type : "granted_rights"',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          layer1: {
            columns: {
              metric_count: {
                label: 'Granted Rights',
                dataType: 'number',
                operationType: 'max',
                isBucketed: false,
                scale: 'ratio',
                sourceField: 'count',
                reducedTimeRange: '',
                params: {
                  format: {
                    id: 'number',
                    params: {
                      decimals: 0,
                      compact: false,
                    },
                  },
                },
                customLabel: true,
              },
            },
            columnOrder: ['metric_count'],
            incompleteColumns: {},
          },
          layer2: {
            linkToLayers: ['layer1'],
            columns: {
              timestamp: {
                label: 'timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                isBucketed: true,
                scale: 'interval',
                params: {},
              },
              metric_count_trend: {
                label: 'Granted Rights',
                dataType: 'number',
                operationType: 'max',
                isBucketed: false,
                scale: 'ratio',
                sourceField: 'count',
                filter: {
                  query: '',
                  language: 'kuery',
                },
                timeShift: '',
                reducedTimeRange: '',
                params: {
                  format: {
                    id: 'number',
                    params: {
                      decimals: 0,
                      compact: false,
                    },
                  },
                },
                customLabel: true,
              },
            },
            columnOrder: ['timestamp', 'metric_count_trend'],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
        },
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'privmon-indexpattern-id',
        name: 'indexpattern-datasource-layer-layer1',
      },
      {
        type: 'index-pattern',
        id: 'privmon-indexpattern-id',
        name: 'indexpattern-datasource-layer-layer2',
      },
    ],
    adHocDataViews: {
      'privmon-indexpattern-id': {
        id: 'privmon-indexpattern-id',
        title: 'privmon-metrics-test-data',
        timeFieldName: 'timestamp',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        name: 'privmon-metrics-test-data',
      },
    },
  },
  references: [],
};

const LENS_VISUALIZATION_HEIGHT = 126;
const LENS_VISUALIZATION_MIN_WIDTH = 160;

export const GrantedRightsTile: React.FC<Props> = ({ timerange }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false}>
      <div
        css={css`
          height: ${LENS_VISUALIZATION_HEIGHT}px;
          min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
          width: auto;
          display: inline-block;
          background: ${euiTheme.colors.lightestShade};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        <VisualizationEmbeddable
          applyGlobalQueriesAndFilters={false}
          applyPageAndTabsFilters={false}
          lensAttributes={grantedRightsLensAttributes}
          id="privileged-user-monitoring-granted-rights"
          timerange={timerange}
          width="auto"
          height={LENS_VISUALIZATION_HEIGHT}
          disableOnClickFilter
          inspectTitle={
            <FormattedMessage
              id="xpack.securitySolution.privmon.grantedRights.inspectTitle"
              defaultMessage="Granted rights"
            />
          }
        />
      </div>
    </EuiFlexItem>
  );
};

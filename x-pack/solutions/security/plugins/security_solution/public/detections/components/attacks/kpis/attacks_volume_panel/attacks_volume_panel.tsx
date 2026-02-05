/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import {
  Chart,
  Settings,
  LineSeries,
  Axis,
  Position,
  ScaleType,
  timeFormatter,
  CurveType,
} from '@elastic/charts';
import { useThemes } from '../../../../../common/components/charts/common';
import { useAttacksVolumeData } from './use_attacks_volume_data';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { DEFAULT_DATE_FORMAT } from '../../../../../../common/constants';
import { ATTACKS_VOLUME_TITLE } from './translations';

const ATTACKS_VOLUME_PANEL_HEIGHT = 200;

export interface AttacksVolumePanelProps {
  /** Optional array of filters to apply to the query */
  filters?: Filter[];
  /** Optional query object */
  query?: Query;
}

/**
 * Renders the attacks volume panel
 * @param props - The props for the component
 * @returns The attacks volume panel
 */
export const AttacksVolumePanel: React.FC<AttacksVolumePanelProps> = React.memo(
  ({ filters, query }) => {
    const [dateFormat] = useUiSetting$<string>(DEFAULT_DATE_FORMAT);
    const { euiTheme } = useEuiTheme();
    const { theme, baseTheme } = useThemes();

    const { items, isLoading } = useAttacksVolumeData({ filters, query });

    return (
      <EuiPanel hasBorder={true}>
        <EuiTitle size="xs">
          <h3>{ATTACKS_VOLUME_TITLE}</h3>
        </EuiTitle>
        <div style={{ height: ATTACKS_VOLUME_PANEL_HEIGHT, width: '100%' }}>
          {isLoading ? (
            <EuiLoadingChart size="xl" />
          ) : (
            <Chart>
              <Settings baseTheme={baseTheme} theme={theme} showLegend={false} />
              <LineSeries
                id={'attacks'}
                data={items}
                xAccessor={'x'}
                yAccessors={['y']}
                xScaleType={ScaleType.Time}
                color={euiTheme.colors.vis.euiColorVis6}
                curve={CurveType.CURVE_MONOTONE_X}
                lineSeriesStyle={{
                  point: { visible: 'never' },
                }}
              />
              <Axis id="bottom" position={Position.Bottom} tickFormat={timeFormatter(dateFormat)} />
              <Axis id="left" position={Position.Left} />
            </Chart>
          )}
        </div>
      </EuiPanel>
    );
  }
);
AttacksVolumePanel.displayName = 'AttacksVolumePanel';

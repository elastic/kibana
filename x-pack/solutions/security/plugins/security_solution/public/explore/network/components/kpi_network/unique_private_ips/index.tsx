/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

import type { StatItems } from '../../../../components/stat_items';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';
import { kpiUniquePrivateIpsSourceMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_source_metric';
import { kpiUniquePrivateIpsDestinationMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_destination_metric';
import { getKpiUniquePrivateIpsAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_area';
import { getKpiUniquePrivateIpsBarLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_bar';
import { KpiBaseComponent } from '../../../../components/kpi';
import {
  getDestinationIpColor,
  getSourceIpColor,
} from '../../../../../common/components/visualization_actions/lens_attributes/common/utils/unique_ips_palette';

export const ID = 'networkKpiUniquePrivateIpsQuery';

export const useGetUniquePrivateIpsStatItems: () => readonly StatItems[] = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => [
      {
        key: 'uniqueIps',
        fields: [
          {
            key: 'uniqueSourcePrivateIps',
            name: i18n.SOURCE_CHART_LABEL,
            description: i18n.SOURCE_UNIT_LABEL,
            color: getSourceIpColor(euiTheme),
            icon: 'visMapCoordinate',
            lensAttributes: kpiUniquePrivateIpsSourceMetricLensAttributes,
          },
          {
            key: 'uniqueDestinationPrivateIps',
            name: i18n.DESTINATION_CHART_LABEL,
            description: i18n.DESTINATION_UNIT_LABEL,
            color: getDestinationIpColor(euiTheme),
            icon: 'visMapCoordinate',
            lensAttributes: kpiUniquePrivateIpsDestinationMetricLensAttributes,
          },
        ],
        description: i18n.UNIQUE_PRIVATE_IPS,
        enableAreaChart: true,
        enableBarChart: true,
        getAreaChartLensAttributes: getKpiUniquePrivateIpsAreaLensAttributes,
        getBarChartLensAttributes: getKpiUniquePrivateIpsBarLensAttributes,
      },
    ],
    [euiTheme]
  );
};

const NetworkKpiUniquePrivateIpsComponent: React.FC<NetworkKpiProps> = ({ from, to }) => {
  const uniquePrivateIpsStatItems = useGetUniquePrivateIpsStatItems();
  return <KpiBaseComponent id={ID} statItems={uniquePrivateIpsStatItems} from={from} to={to} />;
};

export const NetworkKpiUniquePrivateIps = React.memo(NetworkKpiUniquePrivateIpsComponent);

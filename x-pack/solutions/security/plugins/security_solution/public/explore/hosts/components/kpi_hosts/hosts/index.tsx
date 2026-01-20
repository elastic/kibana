/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

import type { StatItems } from '../../../../components/stat_items';
import { getKpiHostAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_host_area';
import { getKpiHostMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_host_metric';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { KpiBaseComponent } from '../../../../components/kpi';
import type { HostsKpiProps } from '../types';
import * as i18n from './translations';

export const ID = 'hostsKpiHostsQuery';

export const useGetHostsStatItems: () => Readonly<StatItems[]> = () => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  return useMemo(
    () => [
      {
        key: 'hosts',
        fields: [
          {
            key: 'hosts',
            color: euiTheme.colors.vis.euiColorVis1,
            icon: 'storage',
            lensAttributes: getKpiHostMetricLensAttributes(spaceId),
          },
        ],
        enableAreaChart: true,
        description: i18n.HOSTS,
        getAreaChartLensAttributes: getKpiHostAreaLensAttributes,
      },
    ],
    [euiTheme.colors.vis.euiColorVis1, spaceId]
  );
};

const HostsKpiHostsComponent: React.FC<HostsKpiProps> = ({ from, to }) => {
  const hostsStatItems = useGetHostsStatItems();
  return <KpiBaseComponent id={ID} statItems={hostsStatItems} from={from} to={to} />;
};

export const HostsKpiHosts = React.memo(HostsKpiHostsComponent);

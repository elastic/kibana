/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { StatItems } from '../../../../components/stat_items';
import { KpiBaseComponent } from '../../../../components/kpi';
import { kpiTotalUsersMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_metric';
import { getKpiTotalUsersAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_area';
import * as i18n from './translations';
import type { UsersKpiProps } from '../types';

export const useGetUsersStatItems: () => Readonly<StatItems[]> = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => [
      {
        key: 'users',
        fields: [
          {
            key: 'users',
            color: euiTheme.colors.vis.euiColorVis0,
            icon: 'storage',
            lensAttributes: kpiTotalUsersMetricLensAttributes,
          },
        ],
        enableAreaChart: true,
        description: i18n.USERS,
        getAreaChartLensAttributes: getKpiTotalUsersAreaLensAttributes,
      },
    ],
    [euiTheme.colors.vis.euiColorVis0]
  );
};

const ID = 'TotalUsersKpiQuery';

const TotalUsersKpiComponent: React.FC<UsersKpiProps> = ({ from, to }) => {
  const usersStatItems = useGetUsersStatItems();
  return <KpiBaseComponent id={ID} statItems={usersStatItems} from={from} to={to} />;
};

export const TotalUsersKpi = React.memo(TotalUsersKpiComponent);

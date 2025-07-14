/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useEuiTheme } from '@elastic/eui';
import type { StatItems } from '../../../../components/stat_items';
import { getKpiUserAuthenticationsAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentications_area';
import { getKpiUserAuthenticationsBarLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentications_bar';
import { kpiUserAuthenticationsMetricSuccessLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentications_metric_success';
import { kpiUserAuthenticationsMetricFailureLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentication_metric_failure';
import { KpiBaseComponent } from '../../../../components/kpi';
import * as i18n from './translations';
import type { UsersKpiProps } from '../types';

const ID = 'usersKpiAuthentications';

export const useGetAuthenticationsStatItems: () => readonly StatItems[] = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => [
      {
        key: 'authentication',
        fields: [
          {
            key: 'authenticationsSuccess',
            name: i18n.SUCCESS_CHART_LABEL,
            description: i18n.SUCCESS_UNIT_LABEL,
            color: euiTheme.colors.vis.euiColorVis0,
            icon: 'check',
            lensAttributes: kpiUserAuthenticationsMetricSuccessLensAttributes,
          },
          {
            key: 'authenticationsFailure',
            name: i18n.FAIL_CHART_LABEL,
            description: i18n.FAIL_UNIT_LABEL,
            color: euiTheme.colors.vis.euiColorVis4,
            icon: 'cross',
            lensAttributes: kpiUserAuthenticationsMetricFailureLensAttributes,
          },
        ],
        enableAreaChart: true,
        enableBarChart: true,
        description: i18n.USER_AUTHENTICATIONS,
        getAreaChartLensAttributes: getKpiUserAuthenticationsAreaLensAttributes,
        getBarChartLensAttributes: getKpiUserAuthenticationsBarLensAttributes,
      },
    ],
    [euiTheme.colors.vis.euiColorVis0, euiTheme.colors.vis.euiColorVis4]
  );
};

const UsersKpiAuthenticationsComponent: React.FC<UsersKpiProps> = ({ from, to }) => {
  const authenticationsStatItems = useGetAuthenticationsStatItems();
  return <KpiBaseComponent id={ID} statItems={authenticationsStatItems} from={from} to={to} />;
};

UsersKpiAuthenticationsComponent.displayName = 'UsersKpiAuthenticationsComponent';

export const UsersKpiAuthentications = React.memo(UsersKpiAuthenticationsComponent);

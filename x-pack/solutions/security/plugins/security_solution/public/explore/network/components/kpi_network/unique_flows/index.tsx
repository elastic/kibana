/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiUniqueFlowIdsLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_flow_ids';
import { KpiBaseComponent } from '../../../../components/kpi';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';

export const ID = 'networkKpiUniqueFlowsQuery';

export const uniqueFlowsStatItems: Readonly<StatItems[]> = [
  {
    key: 'uniqueFlowId',
    fields: [
      {
        key: 'uniqueFlowId',
        lensAttributes: kpiUniqueFlowIdsLensAttributes,
      },
    ],
    description: i18n.UNIQUE_FLOW_IDS,
  },
];

const NetworkKpiUniqueFlowsComponent: React.FC<NetworkKpiProps> = ({ from, to }) => {
  return <KpiBaseComponent id={ID} statItems={uniqueFlowsStatItems} from={from} to={to} />;
};

export const NetworkKpiUniqueFlows = React.memo(NetworkKpiUniqueFlowsComponent);

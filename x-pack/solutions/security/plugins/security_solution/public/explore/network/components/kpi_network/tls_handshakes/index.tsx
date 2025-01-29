/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiTlsHandshakesLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_tls_handshakes';
import { KpiBaseComponent } from '../../../../components/kpi';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';

export const ID = 'networkKpiTlsHandshakesQuery';

export const tlsStatItems: Readonly<StatItems[]> = [
  {
    key: 'tlsHandshakes',
    fields: [
      {
        key: 'tlsHandshakes',
        lensAttributes: kpiTlsHandshakesLensAttributes,
      },
    ],
    description: i18n.TLS_HANDSHAKES,
  },
];

const NetworkKpiTlsHandshakesComponent: React.FC<NetworkKpiProps> = ({ from, to }) => {
  return <KpiBaseComponent id={ID} statItems={tlsStatItems} from={from} to={to} />;
};

export const NetworkKpiTlsHandshakes = React.memo(NetworkKpiTlsHandshakesComponent);

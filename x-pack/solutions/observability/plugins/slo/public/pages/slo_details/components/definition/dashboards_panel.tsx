/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { LinkedDashboards } from './linked_dashboards';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function DashboardsPanel({ slo }: Props) {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.slo.sloDetails.definition.linkedDashboardsTitle', {
            defaultMessage: 'Linked dashboards',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <LinkedDashboards dashboards={slo.artifacts?.dashboards ?? []} />
    </EuiPanel>
  );
}

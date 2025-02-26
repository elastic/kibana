/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Dashboard } from './types';

interface Props {
  dashboards: Dashboard[];
  unassign: (dashboard: Dashboard) => void;
}

export function AssignedDashboardList({ dashboards, unassign }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3>
            {i18n.translate('xpack.slo.assignedDashboardList.title', {
              defaultMessage: 'Assigned dashboards',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      {dashboards.map((dashboard) => (
        <EuiFlexGroup direction="row" key={dashboard.id} gutterSize="s">
          <EuiFlexItem>{dashboard.title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="sloAssignedDashboardListUnassignButton"
              size="s"
              color="danger"
              onClick={() => unassign(dashboard)}
            >
              {i18n.translate('xpack.slo.assignedDashboardList.unassignButtonLabel', {
                defaultMessage: 'Unassign',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  );
}

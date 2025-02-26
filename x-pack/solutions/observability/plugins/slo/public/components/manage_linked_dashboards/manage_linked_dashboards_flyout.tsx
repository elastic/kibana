/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Asset } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { DashboardSearchTable } from './dashboard_search_table';
import type { Dashboard } from './types';
import { AssignedDashboardList } from './assigned_dashboard_list';

interface Props {
  assets: Asset[];
  onClose: () => void;
  onSave: () => void;
}

export function ManageLinkedDashboardsFlyout({ assets, onClose, onSave }: Props) {
  const flyoutId = useGeneratedHtmlId({ prefix: 'linkedDashboardFlyout' });
  const [assignedDashboards, setSelectedDashboards] = useState<Dashboard[]>(
    assets
      .filter((asset) => asset.type === 'dashboard')
      .map((asset) => ({ id: asset.id, title: asset.label }))
  );

  const assign = (dashboard: Dashboard) => {
    setSelectedDashboards((currDashboards) => currDashboards.concat(dashboard));
  };

  const unassign = (dashboard: Dashboard) => {
    setSelectedDashboards((currDashboards) =>
      currDashboards.filter((currDashboard) => currDashboard.id !== dashboard.id)
    );
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutId} ownFocus size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutId}>
            {i18n.translate(
              'xpack.slo.manageLinkedDashboardsFlyout.managedLinkedDashboardsTitleLabel',
              {
                defaultMessage: 'Managed linked dashboards',
              }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <DashboardSearchTable
            assignedDashboards={assignedDashboards}
            assign={assign}
            unassign={unassign}
          />

          <AssignedDashboardList dashboards={assignedDashboards} unassign={unassign} />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="sloLinkedDashboardsFlyoutCloseButton"
              iconType="cross"
              onClick={onClose}
              flush="left"
            >
              {i18n.translate('xpack.slo.manageLinkedDashboardsFlyout.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="sloLinkedDashboardsFlyoutSaveButton" onClick={onSave} fill>
              {i18n.translate('xpack.slo.manageLinkedDashboardsFlyout.saveButtonLabel', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

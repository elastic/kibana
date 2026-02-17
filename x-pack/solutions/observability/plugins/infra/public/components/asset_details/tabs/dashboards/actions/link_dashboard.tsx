/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiToolTip, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import type {
  DashboardItemWithTitle,
  InfraCustomDashboardAssetType,
} from '../../../../../../common/custom_dashboards';
import { SaveDashboardModal } from './save_dashboard_modal';
import { useSavedObjectUserPermissions } from '../../../hooks/use_saved_objects_permissions';

export function LinkDashboard({
  onRefresh,
  newDashboardButton = false,
  customDashboards,
  assetType,
}: {
  onRefresh: () => void;
  newDashboardButton?: boolean;
  customDashboards?: DashboardItemWithTitle[];
  assetType: InfraCustomDashboardAssetType;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { canSave } = useSavedObjectUserPermissions();

  const onClick = useCallback(() => setIsModalVisible(true), []);
  const onClose = useCallback(() => setIsModalVisible(false), []);

  return (
    <>
      <EuiToolTip
        position="top"
        content={
          !canSave ? (
            <p data-test-subj="infraCannotAddDashboardTooltip">
              {i18n.translate(
                'xpack.infra.linkDashboard.tooltip.youDoNotHavePermissionToUseThisFeature',
                {
                  defaultMessage:
                    'You do not have permission to use this feature. Please ask your administrator for access.',
                }
              )}
            </p>
          ) : undefined
        }
      >
        {newDashboardButton ? (
          <EuiButtonEmpty
            color="text"
            size="s"
            iconType="plusInCircle"
            data-test-subj="infraLinkDashboardMenu"
            onClick={onClick}
            disabled={!canSave}
          >
            {i18n.translate('xpack.infra.assetDetails.dashboards.linkNewDashboardButtonLabel', {
              defaultMessage: 'Link new dashboard',
            })}
          </EuiButtonEmpty>
        ) : (
          <EuiButton data-test-subj="infraAddDashboard" onClick={onClick} disabled={!canSave}>
            {i18n.translate('xpack.infra.assetDetails.dashboards.linkButtonLabel', {
              defaultMessage: 'Link dashboard',
            })}
          </EuiButton>
        )}
      </EuiToolTip>
      {isModalVisible && (
        <SaveDashboardModal
          onClose={onClose}
          onRefresh={onRefresh}
          customDashboards={customDashboards}
          assetType={assetType}
        />
      )}
    </>
  );
}

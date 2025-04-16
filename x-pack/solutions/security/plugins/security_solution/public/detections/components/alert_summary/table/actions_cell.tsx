/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import { IOCPanelKey } from '../../../../flyout/ai_for_soc/constants/panel_keys';

export const ROW_ACTION_FLYOUT_ICON_TEST_ID = 'alert-summary-table-row-action-flyout-icon';

export interface ActionsCellProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
}

/**
 * Component used in the AI for SOC alert summary table.
 * It is passed to the renderActionsCell property of the EuiDataGrid.
 * It renders all the icons in the row action icons:
 * - open flyout
 * - assistant (soon)
 * - more actions (soon)
 */
export const ActionsCell = memo(({ alert }: ActionsCellProps) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const onOpenFlyout = useCallback(
    () =>
      openFlyout({
        right: {
          id: IOCPanelKey,
          params: {
            id: alert._id,
            indexName: alert._index,
          },
        },
      }),
    [alert, openFlyout]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.securitySolution.alertSummary.table.flyoutIcon', {
            defaultMessage: 'Open flyout',
          })}
          color="primary"
          data-test-subj={ROW_ACTION_FLYOUT_ICON_TEST_ID}
          iconType="expand"
          onClick={onOpenFlyout}
          size="xs"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

ActionsCell.displayName = 'ActionsCell';

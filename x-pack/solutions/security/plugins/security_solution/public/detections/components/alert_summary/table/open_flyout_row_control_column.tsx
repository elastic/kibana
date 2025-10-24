/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiButtonIcon } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import { useFlyoutApi } from '@kbn/flyout';
import { EasePanelKeyV2 } from '../../../../flyoutV2/ease/constants/panel_keys';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { EasePanelKey } from '../../../../flyout/ease/constants/panel_keys';

export const ROW_ACTION_FLYOUT_ICON_TEST_ID = 'alert-summary-table-row-action-flyout-icon';

export interface ActionsCellProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
}

/**
 * Renders a icon to open EASE alert summary flyout.
 */
export const OpenFlyoutRowControlColumn = memo(({ alert }: ActionsCellProps) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { openFlyout: openFlyoutV2 } = useFlyoutApi();
  const newFlyoutEnabled = useIsExperimentalFeatureEnabled('newFlyout');
  const onOpenFlyout = useCallback(() => {
    if (newFlyoutEnabled) {
      openFlyoutV2({
        main: {
          id: EasePanelKeyV2,
          params: {
            id: alert._id,
            indexName: alert._index,
          },
        },
      });
    } else {
      openFlyout({
        right: {
          id: EasePanelKey,
          params: {
            id: alert._id,
            indexName: alert._index,
          },
        },
      });
    }
  }, [alert._id, alert._index, newFlyoutEnabled, openFlyout, openFlyoutV2]);

  return (
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
  );
});

OpenFlyoutRowControlColumn.displayName = 'OpenFlyoutRowControlColumn';

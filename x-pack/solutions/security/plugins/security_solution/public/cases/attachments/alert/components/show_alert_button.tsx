/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCaseViewNavigation, useCaseViewParams } from '@kbn/cases-plugin/public';
import { CASE_VIEW_PAGE_TABS } from '@kbn/cases-plugin/common';
import { EasePanelKey } from '../../../../flyout/ease/constants/panel_keys';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/shared/constants/panel_keys';
import { TimelineId } from '../../../../../common/types/timeline';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { useKibana } from '../../../../common/lib/kibana';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { SHOW_ALERT_TOOLTIP } from '../translations';

export interface ShowAlertButtonProps {
  id: string;
  alertId: string;
  index: string;
}

export const ShowAlertButton = ({ id, alertId, index }: ShowAlertButtonProps) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const {
    telemetry,
    application: { capabilities },
  } = useKibana().services;
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();

  // TODO We shouldn't have to check capabilities here, this should be done at a much higher level.
  //  https://github.com/elastic/kibana/issues/218741
  const EASE = capabilities[SECURITY_FEATURE_ID].configurations;

  const onClick = useCallback(() => {
    const hasValidIndex = index && String(index).trim();
    if (hasValidIndex) {
      if (EASE) {
        openFlyout({
          right: {
            id: EasePanelKey,
            params: {
              id: alertId,
              indexName: index,
            },
          },
        });
      } else {
        openFlyout({
          right: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: alertId,
              indexName: index,
              scopeId: TimelineId.casePage,
            },
          },
        });
        telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
          location: TimelineId.casePage,
          panel: 'right',
        });
      }
    } else {
      navigateToCaseView({ detailName, tabId: CASE_VIEW_PAGE_TABS.ALERTS });
    }
  }, [EASE, alertId, index, openFlyout, telemetry, detailName, navigateToCaseView]);

  return (
    <EuiToolTip position="top" content={<p>{SHOW_ALERT_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={SHOW_ALERT_TOOLTIP}
        data-test-subj={`comment-action-show-alert-${id}`}
        onClick={onClick}
        iconType="chevronSingleRight"
        id={`${id}-show-alert`}
      />
    </EuiToolTip>
  );
};

ShowAlertButton.displayName = 'ShowAlertButton';

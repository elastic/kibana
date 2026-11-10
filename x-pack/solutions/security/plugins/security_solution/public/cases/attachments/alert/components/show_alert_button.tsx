/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useCaseViewNavigation, useCaseViewParams } from '@kbn/cases-plugin/public';
import { CASE_VIEW_PAGE_TABS } from '@kbn/cases-plugin/common';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { casesCellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { TimelineId } from '../../../../../common/types/timeline';
import { DocumentEventTypes, FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { useKibana } from '../../../../common/lib/kibana';
import { getAlertHistoryTitle } from '../../../../flyout_v2/document/main/utils/get_header_title';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { SHOW_ALERT_TOOLTIP } from '../translations';
import { EaseFlyout } from '../../../../detections/components/alert_summary/flyout/ease_flyout';

export interface ShowAlertButtonProps {
  id: string;
  alertId: string;
  index: string;
  ruleName?: string | null;
}

export const ShowAlertButton = ({ id, alertId, index, ruleName }: ShowAlertButtonProps) => {
  const {
    telemetry,
    application: { capabilities },
  } = useKibana().services;
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();
  const { openDocumentFlyoutFromIndex } = useFlyoutApi();
  const [isEaseFlyoutOpen, setIsEaseFlyoutOpen] = useState(false);
  const closeEaseFlyout = useCallback(() => setIsEaseFlyoutOpen(false), []);

  // TODO We shouldn't have to check capabilities here, this should be done at a much higher level.
  //  https://github.com/elastic/kibana/issues/218741
  const EASE = capabilities[SECURITY_FEATURE_ID].configurations;

  const onClick = useCallback(() => {
    const hasValidIndex = index && String(index).trim();
    if (hasValidIndex) {
      if (EASE) {
        setIsEaseFlyoutOpen(true);
      } else {
        openDocumentFlyoutFromIndex({
          documentId: alertId,
          indexName: index,
          renderCellActions: casesCellActionRenderer,
          origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
          title: getAlertHistoryTitle(ruleName),
        });
        telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
          location: TimelineId.casePage,
          panel: 'right',
        });
      }
    } else {
      navigateToCaseView({ detailName, tabId: CASE_VIEW_PAGE_TABS.ALERTS });
    }
  }, [
    EASE,
    alertId,
    index,
    telemetry,
    detailName,
    navigateToCaseView,
    openDocumentFlyoutFromIndex,
    ruleName,
  ]);

  return (
    <>
      <EuiToolTip position="top" content={<p>{SHOW_ALERT_TOOLTIP}</p>}>
        <EuiButtonIcon
          aria-label={SHOW_ALERT_TOOLTIP}
          data-test-subj={`comment-action-show-alert-${id}`}
          onClick={onClick}
          iconType="chevronSingleRight"
          id={`${id}-show-alert`}
        />
      </EuiToolTip>
      {isEaseFlyoutOpen && <EaseFlyout documentId={alertId} onClose={closeEaseFlyout} />}
    </>
  );
};

ShowAlertButton.displayName = 'ShowAlertButton';

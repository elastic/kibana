/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCaseViewNavigation, useCaseViewParams } from '@kbn/cases-plugin/public';
import { CASE_VIEW_PAGE_TABS } from '@kbn/cases-plugin/common';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/shared/constants/panel_keys';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { casesCellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { TimelineId } from '../../../../../common/types/timeline';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { SHOW_EVENT_TOOLTIP } from '../translations';

export interface ShowEventButtonProps {
  id: string;
  eventId: string;
  index: string;
}

const ShowEventButtonComponent = ({ id, eventId, index }: ShowEventButtonProps) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openDocumentFlyoutFromIndex } = useFlyoutApi();

  const onClick = useCallback(() => {
    const hasValidIndex = index && String(index).trim();
    if (hasValidIndex) {
      if (enableNewFlyout) {
        openDocumentFlyoutFromIndex({
          documentId: eventId,
          indexName: index,
          renderCellActions: casesCellActionRenderer,
        });
      } else {
        openFlyout({
          right: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: eventId,
              indexName: index,
              scopeId: TimelineId.casePage,
            },
          },
        });
      }
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: TimelineId.casePage,
        panel: 'right',
      });
    } else {
      navigateToCaseView({ detailName, tabId: CASE_VIEW_PAGE_TABS.EVENTS });
    }
  }, [
    eventId,
    index,
    openFlyout,
    telemetry,
    detailName,
    navigateToCaseView,
    enableNewFlyout,
    openDocumentFlyoutFromIndex,
  ]);

  return (
    <EuiToolTip position="top" content={<p>{SHOW_EVENT_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={SHOW_EVENT_TOOLTIP}
        data-test-subj={`comment-action-show-event-${id}`}
        onClick={onClick}
        iconType="chevronSingleRight"
        id={`${id}-show-event`}
      />
    </EuiToolTip>
  );
};

ShowEventButtonComponent.displayName = 'ShowEventButton';

export const ShowEventButton = memo(ShowEventButtonComponent);

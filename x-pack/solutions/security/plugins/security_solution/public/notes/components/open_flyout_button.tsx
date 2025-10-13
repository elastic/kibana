/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import { PageScope } from '../../data_view_manager/constants';
import { OPEN_FLYOUT_BUTTON_TEST_ID } from './test_ids';
import { useKibana } from '../../common/lib/kibana';
import { DocumentDetailsRightPanelKey } from '../../flyout/document_details/shared/constants/panel_keys';
import { DocumentEventTypes } from '../../common/lib/telemetry';
import { useSelectedPatterns } from '../../data_view_manager/hooks/use_selected_patterns';

export const OPEN_FLYOUT_BUTTON = i18n.translate(
  'xpack.securitySolution.notes.openFlyoutButtonLabel',
  {
    defaultMessage: 'Expand alert/event details',
  }
);

export interface OpenFlyoutButtonIconProps {
  /**
   * Id of the event to render in the flyout
   */
  eventId: string;
  /**
   * Id of the timeline to pass to the flyout for scope
   */
  timelineId: string;
  /**
   * Icon type to render in the button
   */
  iconType: IconType;
}

/**
 * Renders a button to open the alert and event details flyout.
 * This component is meant to be used in timeline and the notes management page, where the cell actions are more basic (no filter in/out).
 */
export const OpenFlyoutButtonIcon = memo(
  ({ eventId, timelineId, iconType }: OpenFlyoutButtonIconProps) => {
    const selectedPatterns = useSelectedPatterns(PageScope.timeline);

    const { telemetry } = useKibana().services;
    const { openFlyout } = useExpandableFlyoutApi();

    const handleClick = useCallback(() => {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName: selectedPatterns.join(','),
            scopeId: TableId.alertsOnAlertsPage, // TODO we should update the flyout's code to separate scopeId and preview
          },
        },
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: timelineId,
        panel: 'right',
      });
    }, [eventId, openFlyout, selectedPatterns, telemetry, timelineId]);

    return (
      <EuiButtonIcon
        data-test-subj={OPEN_FLYOUT_BUTTON_TEST_ID}
        title={OPEN_FLYOUT_BUTTON}
        aria-label={OPEN_FLYOUT_BUTTON}
        color="text"
        iconType={iconType}
        onClick={handleClick}
      />
    );
  }
);

OpenFlyoutButtonIcon.displayName = 'OpenFlyoutButtonIcon';

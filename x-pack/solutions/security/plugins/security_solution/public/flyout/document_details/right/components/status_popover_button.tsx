/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { getFieldFormat } from '../utils/get_field_format';
import type { EnrichedFieldInfoWithValues } from '../utils/enriched_field_info';
import { useAlertsActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import type { Status } from '../../../../../common/api/detection_engine';
import {
  CHANGE_ALERT_STATUS,
  CLICK_TO_CHANGE_ALERT_STATUS,
} from '../../../../detections/components/alerts_table/translations';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import type { inputsModel } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

interface StatusPopoverButtonProps {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Value used to create a unique identifier in children components
   */
  contextId: string;
  /**
   * Information used to
   */
  enrichedFieldInfo: EnrichedFieldInfoWithValues;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Renders a button and its popover to display the status of an alert and allows the user to change it.
 * It is used in the header of the document details flyout.
 */
export const StatusPopoverButton = memo(
  ({ eventId, contextId, enrichedFieldInfo, scopeId }: StatusPopoverButtonProps) => {
    const { closeFlyout } = useExpandableFlyoutApi();

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const closeAfterAction = useCallback(() => {
      closePopover();
      closeFlyout();
    }, [closeFlyout, closePopover]);

    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuery(), []);

    const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);

    const refetchGlobalQuery = useCallback(() => {
      globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
    }, [globalQueries]);

    const { actionItems } = useAlertsActions({
      closePopover: closeAfterAction,
      eventId,
      scopeId,
      alertStatus: enrichedFieldInfo.values[0] as Status,
      refetch: refetchGlobalQuery,
    });

    const panels = useMemo(() => [{ id: 0, items: actionItems }], [actionItems]);

    // statusPopoverVisible includes the logic for the visibility of the popover in
    // case actionItems is an empty array ( ex, when user has read access ).
    const statusPopoverVisible = useMemo(() => actionItems.length > 0, [actionItems]);

    const button = useMemo(
      () => (
        <FormattedFieldValue
          contextId={contextId}
          eventId={eventId}
          value={enrichedFieldInfo.values[0]}
          fieldName={enrichedFieldInfo.data.field}
          linkValue={enrichedFieldInfo.linkValue}
          fieldType={enrichedFieldInfo.data.type}
          fieldFormat={getFieldFormat(enrichedFieldInfo.data)}
          truncate={false}
          isButton={statusPopoverVisible}
          onClick={statusPopoverVisible ? togglePopover : undefined}
          onClickAriaLabel={CLICK_TO_CHANGE_ALERT_STATUS}
        />
      ),
      [contextId, eventId, enrichedFieldInfo, togglePopover, statusPopoverVisible]
    );

    // EuiPopover is not needed if statusPopoverVisible is false
    if (!statusPopoverVisible) {
      return button;
    }

    return (
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        data-test-subj="alertStatus"
      >
        <EuiPopoverTitle paddingSize="m">{CHANGE_ALERT_STATUS}</EuiPopoverTitle>
        <EuiContextMenu
          panels={panels}
          initialPanelId={0}
          data-test-subj="event-details-alertStatusPopover"
        />
      </EuiPopover>
    );
  }
);

StatusPopoverButton.displayName = 'StatusPopoverButton';

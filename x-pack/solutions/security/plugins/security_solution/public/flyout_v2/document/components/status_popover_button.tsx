/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiPopover, EuiPopoverTitle, useGeneratedHtmlId } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { useAlertsActions } from '../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import type { Status } from '../../../../common/api/detection_engine';
import {
  CHANGE_ALERT_STATUS,
  CLICK_TO_CHANGE_ALERT_STATUS,
} from '../../../detections/components/alerts_table/translations';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';

export interface StatusPopoverButtonFieldInfo {
  data: {
    field: string;
    format?: string | SerializedFieldFormat;
    type: string;
  };
  values: string[];
  linkValue?: string;
}

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
  enrichedFieldInfo: StatusPopoverButtonFieldInfo;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Optional callback to refresh the hosting flyout after a status mutation.
   */
  onStatusUpdated?: () => void;
}

const getFieldFormat = (field?: { format?: string | SerializedFieldFormat }) =>
  typeof field?.format === 'string' ? field.format : field?.format?.id;

/**
 * Renders a button and its popover to display the status of an alert and allows the user to change it.
 * It is used in the header of the document details flyout.
 */
export const StatusPopoverButton = memo(
  ({
    eventId,
    contextId,
    enrichedFieldInfo,
    scopeId,
    onStatusUpdated,
  }: StatusPopoverButtonProps) => {
    const popoverTitleId = useGeneratedHtmlId();

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const { actionItems, panels: actionItemsPanels } = useAlertsActions({
      closePopover,
      eventId,
      scopeId,
      alertStatus: enrichedFieldInfo.values[0] as Status,
      refetch: onStatusUpdated,
    });

    const panels = useMemo(
      () => [{ id: 0, items: actionItems }, ...actionItemsPanels],
      [actionItems, actionItemsPanels]
    );

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
        aria-labelledby={popoverTitleId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        data-test-subj="alertStatus"
      >
        <EuiPopoverTitle id={popoverTitleId} paddingSize="m">
          {CHANGE_ALERT_STATUS}
        </EuiPopoverTitle>
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

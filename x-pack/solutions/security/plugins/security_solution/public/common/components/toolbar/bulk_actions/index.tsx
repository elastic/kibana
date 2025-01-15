/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiButtonEmpty, EuiContextMenu } from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { AlertTableContextMenuItem } from '../../../../detections/components/alerts_table/types';

interface OwnProps {
  selectText: string;
  selectClearAllText: string;
  showClearSelection: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkActionItems: AlertTableContextMenuItem[];
}

const BulkActionsContainer = styled.div`
  display: inline-block;
  position: relative;
`;

BulkActionsContainer.displayName = 'BulkActionsContainer';

/**
 * Stateless component integrating the bulk actions menu and the select all button
 */
const BulkActionsComponent: React.FC<OwnProps> = ({
  selectText,
  selectClearAllText,
  showClearSelection,
  onSelectAll,
  onClearSelection,
  bulkActionItems,
}) => {
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const toggleIsActionOpen = useCallback(() => {
    setIsActionsPopoverOpen((currentIsOpen) => !currentIsOpen);
  }, [setIsActionsPopoverOpen]);

  const closeActionPopover = useCallback(() => {
    setIsActionsPopoverOpen(false);
  }, [setIsActionsPopoverOpen]);

  const closeIfPopoverIsOpen = useCallback(() => {
    if (isActionsPopoverOpen) {
      setIsActionsPopoverOpen(false);
    }
  }, [isActionsPopoverOpen]);

  const toggleSelectAll = useCallback(() => {
    if (!showClearSelection) {
      onSelectAll();
    } else {
      onClearSelection();
    }
  }, [onClearSelection, onSelectAll, showClearSelection]);

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: bulkActionItems,
      },
    ],
    [bulkActionItems]
  );

  return (
    <BulkActionsContainer
      onClick={closeIfPopoverIsOpen}
      data-test-subj="bulk-actions-button-container"
    >
      <EuiPopover
        isOpen={isActionsPopoverOpen}
        anchorPosition="upCenter"
        panelPaddingSize="none"
        button={
          <EuiButtonEmpty
            aria-label="selectedShowBulkActions"
            data-test-subj="selectedShowBulkActionsButton"
            size="xs"
            iconType="arrowDown"
            iconSide="right"
            color="primary"
            onClick={toggleIsActionOpen}
          >
            {selectText}
          </EuiButtonEmpty>
        }
        closePopover={closeActionPopover}
      >
        <EuiContextMenu size="s" panels={panels} initialPanelId={0} />
      </EuiPopover>

      <EuiButtonEmpty
        size="xs"
        aria-label="selectAllAlerts"
        data-test-subj="selectAllAlertsButton"
        iconType={showClearSelection ? 'cross' : 'pagesSelect'}
        onClick={toggleSelectAll}
      >
        {selectClearAllText}
      </EuiButtonEmpty>
    </BulkActionsContainer>
  );
};

export const BulkActions = React.memo(BulkActionsComponent);

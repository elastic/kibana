/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EntityActionItem } from '../types';
import { ApplyFiltersPopover } from '../controls/apply_filters_popover';
import { useGraphFiltersContext } from '../graph/graph_filters_context';
import {
  GRAPH_ENTITY_HOVER_METADATA_FILTERS_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
} from '../test_ids';

export const GRAPH_ENTITY_HOVER_ACTIONS_TOOLBAR_ID = 'cloudSecurityGraphEntityHoverActionsToolbar';

/** Soft rise + fade on appear (n8n-style hover chrome motion). */
const hoverActionsIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;

const hoverActionsOut = keyframes`
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
`;

const entityMetadataShortcutLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.entityHover.entityMetadata',
  { defaultMessage: 'Entity metadata' }
);

interface EntityHoverActionsToolbarProps {
  getItems: () => EntityActionItem[];
  isExiting?: boolean;
  /** Keep entity hover chrome open while the metadata popover portal is active. */
  onMetadataPopoverOpenChange?: (isOpen: boolean) => void;
}

/**
 * Figma Action Menu (node 14282:3835): icon row above the entity on hover.
 * Uses the same actions/toggles as the entity expand popover, plus a Display
 * (layers) shortcut that opens only the Entity Metadata filter section.
 * @see https://www.figma.com/design/NKGsPiGKZ4rEwRVBnuctZ2/branch/1LKHFvfb4x85b5VjpLKYjN/-9.5--Graph-viz---Component-Library?node-id=14282-3835
 */
export const EntityHoverActionsToolbar = memo<EntityHoverActionsToolbarProps>(
  ({ getItems, isExiting = false, onMetadataPopoverOpenChange }) => {
    const { euiTheme } = useEuiTheme();
    // Bump after a toggle so Show/Hide labels refresh while the toolbar stays open.
    const [version, setVersion] = useState(0);
    const [isMetadataOpen, setIsMetadataOpen] = useState(false);
    const graphFilters = useGraphFiltersContext();
    const items = getItems();
    const showMetadataShortcut = graphFilters != null;

    useEffect(() => {
      onMetadataPopoverOpenChange?.(isMetadataOpen);
    }, [isMetadataOpen, onMetadataPopoverOpenChange]);

    useEffect(
      () => () => {
        onMetadataPopoverOpenChange?.(false);
      },
      [onMetadataPopoverOpenChange]
    );

    const closeMetadataPopover = useCallback(() => {
      setIsMetadataOpen(false);
    }, []);

    if (items.length === 0 && !showMetadataShortcut) {
      return null;
    }

    const iconButtonCss = css`
      /* Keep glyph ink consistent; don't force SVG fill (breaks multi-path icons). */
      &,
      &:disabled,
      &[disabled] {
        color: ${euiTheme.colors.textParagraph} !important;
        opacity: 1;
      }
      .euiIcon,
      .euiIcon svg {
        width: ${euiTheme.size.base};
        height: ${euiTheme.size.base};
        /* Prefer crisp vector edges when the node is CSS-scaled by zoom-invariant. */
        shape-rendering: geometricPrecision;
      }
    `;

    const entityDetailsIndex = items.findIndex(
      (item) => item.testSubject === GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
    );
    const itemsBeforeDetails = entityDetailsIndex >= 0 ? items.slice(0, entityDetailsIndex) : items;
    const itemsAfterDetails = entityDetailsIndex >= 0 ? items.slice(entityDetailsIndex) : [];

    const renderActionItem = (item: EntityActionItem) => (
      <EuiToolTip
        key={item.testSubject}
        content={item.label}
        position="top"
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          iconType={item.iconType}
          iconSize="m"
          aria-label={item.label}
          data-test-subj={item.testSubject}
          color="text"
          display="empty"
          /* `s` = 32px hit target — matches Figma row; `xs` (24px) looked soft/undersized */
          size="s"
          disabled={item.disabled}
          css={iconButtonCss}
          onClick={() => {
            item.onClick();
            setVersion((current) => current + 1);
          }}
        />
      </EuiToolTip>
    );

    const metadataShortcut =
      showMetadataShortcut && graphFilters ? (
        <ApplyFiltersPopover
          isOpen={isMetadataOpen}
          onClose={closeMetadataPopover}
          filtersState={graphFilters.filtersState}
          onFiltersChange={graphFilters.onFiltersChange}
          variant="nodeMetadata"
          anchorPosition="downCenter"
        >
          <EuiToolTip
            content={entityMetadataShortcutLabel}
            position="top"
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="layers"
              iconSize="m"
              aria-label={entityMetadataShortcutLabel}
              data-test-subj={GRAPH_ENTITY_HOVER_METADATA_FILTERS_ID}
              color={isMetadataOpen ? 'primary' : 'text'}
              display="empty"
              size="s"
              css={iconButtonCss}
              onClick={() => setIsMetadataOpen((open) => !open)}
            />
          </EuiToolTip>
        </ApplyFiltersPopover>
      ) : null;

    return (
      <div
        key={version}
        data-test-subj={GRAPH_ENTITY_HOVER_ACTIONS_TOOLBAR_ID}
        role="toolbar"
        aria-label="Entity actions"
        css={css`
          position: absolute;
          left: 50%;
          bottom: calc(100% + ${euiTheme.size.xs});
          /* Figma Action Menu: 32px tall row with 16px glyphs */
          height: ${euiTheme.size.xl};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: ${euiTheme.size.xs};
          z-index: 5;
          pointer-events: ${isExiting ? 'none' : 'auto'};
          transform: translateX(-50%);
          animation: ${isExiting ? hoverActionsOut : hoverActionsIn} 0.14s ease-out forwards;
        `}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {itemsBeforeDetails.map(renderActionItem)}
        {metadataShortcut}
        {itemsAfterDetails.map(renderActionItem)}
      </div>
    );
  }
);

EntityHoverActionsToolbar.displayName = 'EntityHoverActionsToolbar';

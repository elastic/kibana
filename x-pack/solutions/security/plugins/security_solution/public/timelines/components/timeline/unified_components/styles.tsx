/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { css, Global } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiProgress } from '@elastic/eui';

export const StyledTableFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;

  .dscPageBody__contents {
    overflow: hidden;
    height: 100%;
  }
`;

export const StyledUnifiedTableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.euiTheme.size.m};`}
  overflow: hidden;
`;

export const StyledEuiProgress = styled(EuiProgress)`
  z-index: 2;
`;

export const StyledPageContentWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  position: relative;
`;

const StyledMainEuiPanelRoot = styled(EuiPanel)`
  overflow: hidden; // Ensures horizontal scroll of table
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const StyledMainEuiPanel: React.FC<React.ComponentProps<typeof EuiPanel>> = ({
  className = '',
  ...props
}) => (
  <StyledMainEuiPanelRoot className={`udtPageContent__wrapper ${className}`.trim()} {...props} />
);

export const leadingActionsColumnStyles = `
  .udtTimeline .euiDataGridRowCell--controlColumn:nth-child(3) .euiDataGridRowCell__content {
    padding: 0;
  }
`;

const StyledTimelineUnifiedDataTableRoot = styled.div`
  height: 100%;

  .udtTimeline .euiDataGrid__virtualized {
    ${({ theme }) =>
      `scrollbar-color: ${theme.euiTheme.colors.mediumShade} ${theme.euiTheme.colors.lightShade}`};
  }

  .udtTimeline [data-gridcell-column-id|='select'] {
    border-right: none;
  }

  .udtTimeline [data-gridcell-column-id|='openDetails'] {
    /* custom row height based on number of lines */

    .euiDataGridRowCell__content--lineCountHeight,

      /* auto row height */
    .euiDataGridRowCell__content--autoHeight {
      margin-top: 9px;
    }

    /* single row height */

    .euiDataGridRowCell__content--defaultHeight {
      margin-top: 3px;
    }
  }

  .udtTimeline
    .euiDataGridHeaderCell.euiDataGridHeaderCell--controlColumn:not(
      [data-gridcell-column-id='select']
    ) {
    padding: 0;
    position: relative;
  }

  .udtTimeline .euiDataGridRowCell--controlColumn {
    overflow: visible;
  }

  .udtTimeline [data-gridcell-column-id|='select'] {
    /* custom row height based on number of lines */

    .euiDataGridRowCell__content--lineCountHeight,

      /* auto row height */
    .euiDataGridRowCell__content--autoHeight {
      margin-top: 3px;
    }

    /* single row height */

    .euiDataGridRowCell__content--defaultHeight {
      margin-top: 3px;
    }
  }

  .udtTimeline
    [data-gridcell-column-id|='select']
    .udtTimeline
    .euiDataGridRow:hover
    .euiDataGridRowCell--lastColumn.euiDataGridRowCell--controlColumn {
    ${({ theme }) => `background-color: ${theme.euiTheme.colors.lightShade};`};
  }

  .udtTimeline .euiDataGridRowCell--lastColumn.euiDataGridRowCell--controlColumn {
    ${({ theme }) => `background-color: ${theme.euiTheme.colors.emptyShade};`};
  }

  .udtTimeline .siemEventsTable__trSupplement--summary {
    border-radius: 8px;
  }

  .udtTimeline .euiDataGridRow:has(.buildingBlockType),
  .udtTimeline .euiDataGridRow.buildingBlockType {
    background: repeating-linear-gradient(
      127deg,
      rgba(245, 167, 0, 0.2),
      rgba(245, 167, 0, 0.2) 1px,
      rgba(245, 167, 0, 0.05) 2px,
      rgba(245, 167, 0, 0.05) 10px
    );
  }

  .udtTimeline .euiDataGridRow:has(.eqlSequence),
  .udtTimeline .euiDataGridRow.eqlSequence {
    .euiDataGridRowCell--controlColumn.euiDataGridRowCell--lastColumn,
    .udt--customRow {
      ${({ theme }) => `border-left: 4px solid ${theme.euiTheme.colors.primary}`};
    }

    background: repeating-linear-gradient(
      127deg,
      rgba(0, 107, 180, 0.2),
      rgba(0, 107, 180, 0.2) 1px,
      rgba(0, 107, 180, 0.05) 2px,
      rgba(0, 107, 180, 0.05) 10px
    );
  }

  .udtTimeline .euiDataGridRow:has(.eqlNonSequence),
  .udtTimeline .euiDataGridRow.eqlNonSequence {
    .euiDataGridRowCell--controlColumn.euiDataGridRowCell--lastColumn,
    .udt--customRow {
      ${({ theme }) => `border-left: 4px solid ${theme.euiTheme.colors.accent};`}
    }

    background: repeating-linear-gradient(
      127deg,
      rgba(221, 10, 115, 0.2),
      rgba(221, 10, 115, 0.2) 1px,
      rgba(221, 10, 115, 0.05) 2px,
      rgba(221, 10, 115, 0.05) 10px
    );
  }

  .udtTimeline .euiDataGridRow:has(.nonRawEvent),
  .udtTimeline .euiDataGridRow.nonRawEvent {
    .euiDataGridRowCell--controlColumn.euiDataGridRowCell--lastColumn,
    .udt--customRow {
      ${({ theme }) => `border-left: 4px solid ${theme.euiTheme.colors.warning};`}
    }
  }

  .udtTimeline .euiDataGridRow:has(.rawEvent),
  .udtTimeline .euiDataGridRow.rawEvent {
    .euiDataGridRowCell--controlColumn.euiDataGridRowCell--lastColumn,
    .udt--customRow {
      ${({ theme }) => `border-left: 4px solid ${theme.euiTheme.colors.lightShade};`}
    }
  }

  .udtTimeline .rowCellWrapper {
    display: flex;
    width: fit-content;
  }

  .udtTimeline .rightPosition {
    position: absolute;
    right: 5px;

    button {
      ${({ theme }) => `color: ${theme.euiTheme.colors.darkShade};`}
    }
  }

  .udtTimeline .euiDataGrid__rightControls {
    padding-right: 30px;
  }

  .udtTimeline .euiDataGrid__leftControls {
    display: flex;
    align-items: baseline;
  }

  .euiDataGrid__customRenderBody {
    scrollbar-color: transparent !important;
  }

  ${leadingActionsColumnStyles}
`;

export const StyledTimelineUnifiedDataTable: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => (
  <StyledTimelineUnifiedDataTableRoot
    className={`unifiedDataTable ${className}`.trim()}
    role="rowgroup"
    {...props}
  />
);

// we need this flyout to be above the timeline flyout (which has a z-index of 1003)
export const UnifiedTimelineGlobalStyles = () => (
  <Global
    styles={css`
      body:has(.timeline-portal-overlay-mask) .unifiedDataTable__cellPopover {
        z-index: 1004 !important;
      }
    `}
  />
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled, { createGlobalStyle } from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiProgress } from '@elastic/eui';

export const StyledTableFlexGroup = styled(EuiFlexGroup).attrs(({ className = '' }) => ({
  className: `${className}`,
}))`
  margin: 0;
  width: 100%;
  overflow: hidden;

  .dscPageBody__contents {
    overflow: hidden;
    height: 100%;
  }
`;

export const StyledUnifiedTableFlexItem = styled(EuiFlexItem).attrs(({ className = '' }) => ({
  className: `${className}`,
}))`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
`;

export const StyledEuiProgress = styled(EuiProgress)`
  z-index: 2;
`;

export const StyledPageContentWrapper = styled.div.attrs(({ className = '' }) => ({
  className: `${className}`,
}))`
  height: 100%;
  overflow: hidden;
  position: relative;
`;

export const StyledMainEuiPanel = styled(EuiPanel).attrs(({ className = '' }) => ({
  className: `udtPageContent__wrapper ${className}`,
}))`
  overflow: hidden; // Ensures horizontal scroll of table
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const leadingActionsColumnStyles = `
  .udtTimeline .euiDataGridRowCell--controlColumn:nth-child(3) .euiDataGridRowCell__content {
    padding: 0;
  }
`;

export const StyledTimelineUnifiedDataTable = styled.div.attrs(({ className = '' }) => ({
  className: `unifiedDataTable ${className}`,
  role: 'rowgroup',
}))`
  .udtTimeline .euiDataGrid__virtualized {
    ${({ theme }) =>
      `scrollbar-color: ${theme.eui.euiColorMediumShade} ${theme.eui.euiColorLightShade}`};
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
      margin-top: 6px;
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
    ${({ theme }) => `background-color: ${theme.eui.colorLightShade};`};
  }

  .udtTimeline .euiDataGridRowCell--lastColumn.euiDataGridRowCell--controlColumn {
    ${({ theme }) => `background-color: ${theme.eui.emptyShade};`};
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
      ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorPrimary}`};
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
      ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorAccent};`}
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
      ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorWarning};`}
    }
  }

  .udtTimeline .euiDataGridRow:has(.rawEvent),
  .udtTimeline .euiDataGridRow.rawEvent {
    .euiDataGridRowCell--controlColumn.euiDataGridRowCell--lastColumn,
    .udt--customRow {
      ${({ theme }) => `border-left: 4px solid ${theme.eui.euiColorLightShade};`}
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
      ${({ theme }) => `color: ${theme.eui.euiColorDarkShade};`}
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

export const UnifiedTimelineGlobalStyles = createGlobalStyle`
  body:has(.timeline-portal-overlay-mask) .unifiedDataTable__cellPopover {
    z-index: 1001 !important;
  }
`;

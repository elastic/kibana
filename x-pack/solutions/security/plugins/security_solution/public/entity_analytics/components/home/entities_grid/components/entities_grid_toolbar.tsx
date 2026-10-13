/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  useEuiFontSize,
  useEuiTheme,
  type EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AdditionalControls } from '../../entities_table/additional_controls';
import { LastUpdated } from '../../last_updated';

const RESOLVED_ROWS_TOTAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.resolvedRowsTotalTitle',
  { defaultMessage: 'resolved entities' }
);

const INDIVIDUAL_ROWS_TOTAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.individualRowsTotalTitle',
  { defaultMessage: 'entity records' }
);

interface UseEntityGridToolbarOptions {
  total: number;
  isIndividualRows: boolean;
  visibleColumns: string[];
  onAddColumn: (columnId: string) => void;
  onRemoveColumn: (columnId: string) => void;
  onResetColumns: () => void;
  updatedAt: number | null;
  /** The toolbar shows only with a group selector. */
  groupSelectorComponent?: React.ReactNode;
}

/** The grid's toolbar: the total with the fields button, when it was updated, and the group selector. */
export const useEntityGridToolbarVisibility = ({
  total,
  isIndividualRows,
  visibleColumns,
  onAddColumn,
  onRemoveColumn,
  onResetColumns,
  updatedAt,
  groupSelectorComponent,
}: UseEntityGridToolbarOptions): EuiDataGridToolBarVisibilityOptions | false => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: toolbarFontSize, lineHeight: toolbarLineHeight } = useEuiFontSize('xs');
  const showToolbar = groupSelectorComponent !== undefined;

  return useMemo(
    () =>
      showToolbar
        ? {
            showColumnSelector: true,
            showSortSelector: false,
            showDisplaySelector: true,
            showKeyboardShortcuts: true,
            additionalControls: {
              left: {
                prepend: (
                  <div
                    css={css`
                      .entityAnalyticsDataTableTotal {
                        font-weight: ${euiTheme.font.weight.semiBold};
                        font-size: ${toolbarFontSize};
                        line-height: ${toolbarLineHeight};
                        border-inline-end: ${euiTheme.border.thin};
                        padding-inline-end: ${euiTheme.size.m};
                        margin-inline-end: ${euiTheme.size.xs};
                      }
                    `}
                  >
                    <AdditionalControls
                      total={total}
                      title={
                        isIndividualRows ? INDIVIDUAL_ROWS_TOTAL_TITLE : RESOLVED_ROWS_TOTAL_TITLE
                      }
                      columns={visibleColumns}
                      onAddColumn={onAddColumn}
                      onRemoveColumn={onRemoveColumn}
                      onResetColumns={onResetColumns}
                    />
                  </div>
                ),
              },
              right: (
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: ${euiTheme.size.m};
                  `}
                >
                  {updatedAt != null ? <LastUpdated updatedAt={updatedAt} /> : null}
                  {groupSelectorComponent}
                </div>
              ),
            },
          }
        : false,
    [
      showToolbar,
      total,
      isIndividualRows,
      visibleColumns,
      onAddColumn,
      onRemoveColumn,
      onResetColumns,
      updatedAt,
      euiTheme.font.weight.semiBold,
      toolbarFontSize,
      toolbarLineHeight,
      euiTheme.border.thin,
      euiTheme.size.m,
      euiTheme.size.xs,
      groupSelectorComponent,
    ]
  );
};

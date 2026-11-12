/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import {
  ENTITY_INVENTORY_EBT_ACTIONS,
  ENTITY_INVENTORY_EBT_ELEMENTS,
} from '../../../ebt_constants';
import {
  EMPTY_BODY,
  EMPTY_WITH_FAILURES_BODY,
  LOADING_ENTITIES_LABEL,
  LOAD_ERROR_TITLE,
  RETRY_LABEL,
  getEmptyTitle,
  getEmptyWithFailuresTitle,
  getTypeNotAvailableTitle,
} from './translations';

/** Width of each skeleton bar within its cell, one entry per column (5 columns). */
const SKELETON_BAR_WIDTHS = ['40%', '85%', '60%', '70%', '50%'] as const;
/** The first column is narrower than the other 4, which share the rest of the width equally. */
const SKELETON_FIRST_COLUMN_WIDTH = '14%';
const SKELETON_ROW_COUNT = 8;

/** Shown while the page's `types` request is running. */
export const EntityTableLoading = () => (
  <EuiEmptyPrompt
    icon={<EuiLoadingSpinner size="xl" />}
    title={<h2>{LOADING_ENTITIES_LABEL}</h2>}
    data-test-subj="entityInventoryTableLoading"
  />
);

/**
 * Shown in a type's section while its first list loads: a bordered table of placeholder bars, with
 * a header row and no header text, since the columns arrive with the `_list` response.
 */
export const EntityTableSkeleton = () => {
  const { euiTheme } = useEuiTheme();
  const tableCss = css`
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  `;
  const headerCellCss = css`
    padding: ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
    &:first-child {
      width: ${SKELETON_FIRST_COLUMN_WIDTH};
    }
  `;
  const bodyCellCss = css`
    padding: ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
  `;

  return (
    <EuiSkeletonLoading
      isLoading
      contentAriaLabel={LOADING_ENTITIES_LABEL}
      data-test-subj="entityInventoryTableSkeleton"
      loadedContent={null}
      loadingContent={
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          <table css={tableCss} aria-hidden="true">
            <thead>
              <tr data-test-subj="entityInventoryTableSkeletonHeaderRow">
                {SKELETON_BAR_WIDTHS.map((_, column) => (
                  <th key={column} css={headerCellCss}>
                    <EuiSkeletonRectangle width="100%" height={euiTheme.size.l} borderRadius="s" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SKELETON_ROW_COUNT }, (_, row) => (
                <tr key={row} data-test-subj="entityInventoryTableSkeletonRow">
                  {SKELETON_BAR_WIDTHS.map((width, column) => (
                    <td key={column} css={bodyCellCss}>
                      <EuiSkeletonRectangle
                        width={width}
                        height={euiTheme.size.base}
                        borderRadius="s"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </EuiPanel>
      }
    />
  );
};

/** Shown when the inventory does not know the requested entity type. */
export const EntityTableTypeNotAvailable = ({ entityType }: { entityType: string }) => (
  <EuiEmptyPrompt
    iconType="magnify"
    title={<h2>{getTypeNotAvailableTitle(entityType)}</h2>}
    data-test-subj="entityInventoryTypeNotAvailable"
  />
);

export interface EntityTableLoadErrorProps {
  /** Reported as the click detail of the retry button: the entity type, or `types` for the type list. */
  ebtDetail: string;
  message: string;
  onRetry: () => void;
}

/** Shown when a request failed, with a way to try again. */
export const EntityTableLoadError = ({
  ebtDetail,
  message,
  onRetry,
}: EntityTableLoadErrorProps) => (
  <EuiEmptyPrompt
    color="danger"
    iconType="warning"
    title={<h2>{LOAD_ERROR_TITLE}</h2>}
    body={<p>{message}</p>}
    actions={
      <EuiButton
        color="danger"
        onClick={onRetry}
        data-test-subj="entityInventoryTableRetry"
        {...getEbtProps({
          action: ENTITY_INVENTORY_EBT_ACTIONS.RETRY_LOAD,
          element: ENTITY_INVENTORY_EBT_ELEMENTS.ENTITY_TABLE,
          detail: ebtDetail,
        })}
      >
        {RETRY_LABEL}
      </EuiButton>
    }
    data-test-subj="entityInventoryTableError"
  />
);

export interface EntityTableEmptyProps {
  typeName: string;
  /** The response could not confirm that nothing matched: a source failed. */
  isIncomplete: boolean;
}

/**
 * Shown when no entities came back. A time range hint only fits a complete response; after a
 * failed source the entities may exist, so the text points at the failure instead.
 */
export const EntityTableEmpty = ({ typeName, isIncomplete }: EntityTableEmptyProps) => (
  <EuiEmptyPrompt
    iconType="magnify"
    title={<h2>{isIncomplete ? getEmptyWithFailuresTitle(typeName) : getEmptyTitle(typeName)}</h2>}
    body={<p>{isIncomplete ? EMPTY_WITH_FAILURES_BODY : EMPTY_BODY}</p>}
    data-test-subj="entityInventoryTableEmpty"
  />
);

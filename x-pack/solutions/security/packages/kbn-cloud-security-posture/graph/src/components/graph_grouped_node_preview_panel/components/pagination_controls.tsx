/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPopover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { i18nNamespaceKey } from '../constants';
import { PAGE_SIZE_BTN_TEST_ID } from '../test_ids';

const GROUPED_PREVIEW_PAGINATION_SETTINGS_KEY =
  'securitySolution.graphGroupedNodePreview.pagination';

const PAGE_OPTIONS = [10, 20, 50];
export const MIN_PAGE_SIZE = PAGE_OPTIONS[0];

const rowsPerPageLabel = i18n.translate(`${i18nNamespaceKey}.rowsPerPageLabel`, {
  defaultMessage: 'Rows per page',
});

const rowsLabel = i18n.translate(`${i18nNamespaceKey}.rowsLabel`, {
  defaultMessage: 'rows',
});

const paginationLabel = i18n.translate(`${i18nNamespaceKey}.paginationLabel`, {
  defaultMessage: 'Pagination controls',
});

export interface PaginationControlsProps {
  totalHits: number;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
}

export const PaginationControls = ({ totalHits, onPaginationChange }: PaginationControlsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Manage pagination state internally with localStorage
  const [pagination, setPagination] = useLocalStorage<{
    pageIndex: number;
    pageSize: number;
  }>(GROUPED_PREVIEW_PAGINATION_SETTINGS_KEY, {
    pageIndex: 0,
    pageSize: MIN_PAGE_SIZE,
  });

  // Reset pageIndex if current page is out of bounds
  useEffect(() => {
    if (pagination && totalHits > 0) {
      const maxPageIndex = Math.ceil(totalHits / pagination.pageSize) - 1;
      if (pagination.pageIndex > maxPageIndex) {
        const newPagination = { ...pagination, pageIndex: 0 };
        setPagination(newPagination);
        onPaginationChange(newPagination);
      }
    }
  }, [totalHits, pagination, setPagination, onPaginationChange]);

  const onButtonClick = () => setIsPopoverOpen((s) => !s);
  const closePopover = () => setIsPopoverOpen(false);

  const goToPage = (pageNumber: number) => {
    if (!pagination) return;
    const newPagination = { ...pagination, pageIndex: pageNumber };
    setPagination(newPagination);
    onPaginationChange(newPagination);
  };

  const getIconType = (size: number) => {
    return size === pagination?.pageSize ? 'check' : 'empty';
  };

  const button = (
    <EuiButtonEmpty
      data-test-subj={PAGE_SIZE_BTN_TEST_ID}
      size="xs"
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      aria-label={rowsPerPageLabel}
    >
      {`${rowsPerPageLabel}: ${pagination?.pageSize ?? MIN_PAGE_SIZE}`}
    </EuiButtonEmpty>
  );

  const items = PAGE_OPTIONS.map((rowsNumber) => {
    return (
      <EuiContextMenuItem
        key={`${rowsNumber} rows`}
        icon={getIconType(rowsNumber)}
        onClick={() => {
          closePopover();
          const newPagination = { pageSize: rowsNumber, pageIndex: 0 };
          setPagination(newPagination);
          onPaginationChange(newPagination);
        }}
      >
        {`${rowsNumber} ${rowsLabel}`}
      </EuiContextMenuItem>
    );
  });

  if (!pagination) return null;

  const pageCount = Math.ceil(totalHits / pagination.pageSize);

  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      alignItems="center"
      wrap
      css={css`
        flex-grow: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPagination
          aria-label={paginationLabel}
          pageCount={pageCount}
          activePage={pagination.pageIndex}
          onPageClick={goToPage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

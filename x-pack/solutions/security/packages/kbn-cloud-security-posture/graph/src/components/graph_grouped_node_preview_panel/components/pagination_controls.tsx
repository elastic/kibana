/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { PAGE_SIZE_OPTIONS } from '../use_pagination';

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
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  goToPage: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
}

export const PaginationControls = ({
  totalHits,
  pagination,
  goToPage,
  setPageSize,
}: PaginationControlsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((s) => !s);
  const closePopover = () => setIsPopoverOpen(false);

  const getIconType = (size: number) => {
    return size === pagination.pageSize ? 'check' : 'empty';
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
      {`${rowsPerPageLabel}: ${pagination.pageSize}`}
    </EuiButtonEmpty>
  );

  const items = PAGE_SIZE_OPTIONS.map((rowsNumber) => {
    return (
      <EuiContextMenuItem
        key={`${rowsNumber} rows`}
        icon={getIconType(rowsNumber)}
        onClick={() => {
          closePopover();
          setPageSize(rowsNumber);
        }}
      >
        {`${rowsNumber} ${rowsLabel}`}
      </EuiContextMenuItem>
    );
  });

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

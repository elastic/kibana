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
  pageIndex: number;
  pageSize: number;
  pageCount?: number;
  onChangeItemsPerPage: (pageSize: number) => void;
  onChangePage: (pageIndex: number) => void;
}

export const PaginationControls = ({
  pageSize,
  pageIndex,
  pageCount = 10,
  onChangeItemsPerPage,
  onChangePage,
}: PaginationControlsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activePage, setActivePage] = useState(pageIndex);
  const [rowSize, setRowSize] = useState(pageSize);

  const onButtonClick = () => setIsPopoverOpen((s) => !s);
  const closePopover = () => setIsPopoverOpen(false);

  const goToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
    onChangePage(pageNumber);
  };

  const getIconType = (size: number) => {
    return size === rowSize ? 'check' : 'empty';
  };

  const button = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      aria-label="Rows per page"
    >
      {`${rowsPerPageLabel}: ${rowSize}`}
    </EuiButtonEmpty>
  );

  const items = [10, 20, 50].map((rowsNumber) => {
    return (
      <EuiContextMenuItem
        key={`${rowsNumber} rows`}
        icon={getIconType(rowsNumber)}
        onClick={() => {
          closePopover();
          setRowSize(rowsNumber);
          onChangeItemsPerPage(rowsNumber);
        }}
      >
        {`${rowsNumber} ${rowsLabel}`}
      </EuiContextMenuItem>
    );
  });

  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      alignItems="center"
      responsive={false}
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
          activePage={activePage}
          onPageClick={goToPage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

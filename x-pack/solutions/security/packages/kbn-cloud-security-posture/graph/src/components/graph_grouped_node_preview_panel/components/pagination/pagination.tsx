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
      {`Rows per page: ${rowSize}`}
    </EuiButtonEmpty>
  );

  const items = [
    <EuiContextMenuItem
      key="10 rows"
      icon={getIconType(10)}
      onClick={() => {
        closePopover();
        setRowSize(10);
        onChangeItemsPerPage(10);
      }}
    >
      {'10 rows'}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="20 rows"
      icon={getIconType(20)}
      onClick={() => {
        closePopover();
        setRowSize(20);
        onChangeItemsPerPage(20);
      }}
    >
      {'20 rows'}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="50 rows"
      icon={getIconType(50)}
      onClick={() => {
        closePopover();
        setRowSize(50);
        onChangeItemsPerPage(50);
      }}
    >
      {'50 rows'}
    </EuiContextMenuItem>,
  ];

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
          aria-label="Custom pagination example"
          pageCount={pageCount}
          activePage={activePage}
          onPageClick={goToPage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

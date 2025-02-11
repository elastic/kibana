/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { css } from '@emotion/css';
import styled from '@emotion/styled';
import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSearchBar,
} from '@elastic/eui';
import { useFindListItems, useGetListById } from '@kbn/securitysolution-list-hooks';
import { FormattedDate } from '../../common/components/formatted_date';
import { useKibana } from '../../common/lib/kibana';
import { AddListItemPopover } from './add_list_item_popover';
import { UploadListItem } from './upload_list_item';
import { ListItemTable } from './list_item_table';
import { Info } from './info';
import type { SortFields, ValueListModalProps, OnTableChange, Sorting } from '../types';
import {
  INFO_UPDATED_AT,
  INFO_TYPE,
  INFO_UPDATED_BY,
  INFO_TOTAL_ITEMS,
  getInfoTotalItems,
} from '../translations';

const ModalBody = styled(EuiFlexGroup)`
  overflow: hidden;
  padding: ${({ theme }) => theme.euiTheme.size.base};
`;

const modalWindow = css`
  min-height: 90vh;
  margin-top: 5vh;
  max-width: 1400px;
  min-width: 700px;
`;

const tableStyle = css`
  overflow: scroll;
`;

export const ValueListModal = ({ listId, onCloseModal, canWriteIndex }: ValueListModalProps) => {
  const [filter, setFilter] = useState('');
  const http = useKibana().services.http;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortFields>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    data: listItems,
    isLoading: isListItemsLoading,
    isError,
  } = useFindListItems({
    listId,
    pageIndex: pageIndex + 1,
    pageSize,
    sortField,
    sortOrder,
    filter,
    http,
  });

  const { data: list, isLoading: isListLoading } = useGetListById({ http, id: listId });

  const onTableChange: OnTableChange = ({ page, sort }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    if (sort) {
      setSortField(sort.field as SortFields);
      setSortOrder(sort.direction);
    }
  };

  const sorting: Sorting = {
    sort: {
      field: sortField,
      direction: sortOrder,
    },
    enableAllColumns: false,
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: listItems?.total ?? 0,
    pageSizeOptions: [5, 10, 25],
  };

  const onQueryChange: NonNullable<EuiSearchBarProps['onChange']> = useCallback((params) => {
    setFilter(params.queryText);
  }, []);

  const isListExist = !isListLoading && !!list;

  return (
    <EuiModal maxWidth={false} className={modalWindow} onClose={onCloseModal}>
      <>
        <EuiModalHeader>
          {isListExist && (
            <EuiFlexGroup justifyContent="spaceBetween" wrap>
              <EuiFlexItem grow={false}>
                <EuiModalHeaderTitle data-test-subj="value-list-items-modal-title">
                  {list.id}
                </EuiModalHeaderTitle>
                <EuiSpacer size="s" />
                {list.description && (
                  <>
                    <EuiText size="s">{list.description}</EuiText>
                    <EuiSpacer size="xs" />
                  </>
                )}
                <EuiFlexGroup
                  data-test-subj="value-list-items-modal-info"
                  justifyContent="flexStart"
                >
                  <Info label={INFO_TYPE} value={list.type} />
                  <Info
                    label={INFO_UPDATED_AT}
                    value={<FormattedDate value={list.updated_at} fieldName="updated_at" />}
                  />
                  <Info label={INFO_UPDATED_BY} value={list.updated_by} />
                  {listItems && <Info label={INFO_TOTAL_ITEMS} value={listItems?.total ?? '-'} />}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                {canWriteIndex && (
                  <EuiFlexGroup alignItems="flexStart" justifyContent="flexEnd">
                    <AddListItemPopover listId={listId} />
                    <UploadListItem listId={listId} type={list.type} />
                  </EuiFlexGroup>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiModalHeader>
        <ModalBody direction="column">
          <EuiFlexItem grow={false}>
            <EuiSearchBar
              onChange={onQueryChange}
              data-test-subj="value-list-items-modal-search-bar"
              box={{
                [`data-test-subj`]: 'value-list-items-modal-search-bar-input',
                placeholder: getInfoTotalItems(list?.type ?? ''),
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true} className={tableStyle}>
            {!isListExist ? (
              <EuiLoadingSpinner size="xxl" />
            ) : (
              <ListItemTable
                items={listItems?.data ?? []}
                pagination={pagination}
                sorting={sorting}
                loading={isListItemsLoading}
                onChange={onTableChange}
                isError={isError}
                canWriteIndex={canWriteIndex}
                list={list}
              />
            )}
          </EuiFlexItem>
        </ModalBody>
      </>
    </EuiModal>
  );
};

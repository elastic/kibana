/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { FC } from 'react';

import type { EuiSearchBarProps, IconType, SearchFilterConfig } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSearchBar } from '@elastic/eui';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { GetExceptionItemProps } from '../types';

const ITEMS_SCHEMA = {
  strict: true,
  fields: {
    created_by: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    id: {
      type: 'string',
    },
    item_id: {
      type: 'string',
    },
    list_id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    os_types: {
      type: 'string',
    },
    tags: {
      type: 'string',
    },
  },
};
interface SearchBarProps {
  addExceptionButtonText?: string;
  placeholdertext?: string;
  canAddException?: boolean; // TODO what is the default value

  // TODO: REFACTOR: not to send the listType and handle it in the Parent
  // Exception list type used to determine what type of item is
  // being created when "onAddExceptionClick" is invoked
  listType: ExceptionListTypeEnum;
  isSearching?: boolean;
  dataTestSubj?: string;
  filters?: SearchFilterConfig[]; // TODO about filters
  isButtonFilled?: boolean;
  buttonIconType?: IconType;
  onSearch: (arg: GetExceptionItemProps) => void;
  onAddExceptionClick: (type: ExceptionListTypeEnum) => void;
}
const SearchBarComponent: FC<SearchBarProps> = ({
  addExceptionButtonText,
  placeholdertext,
  canAddException,
  listType,
  isSearching,
  dataTestSubj,
  filters = [],
  isButtonFilled = true,
  buttonIconType,
  onSearch,
  onAddExceptionClick,
}) => {
  const handleOnSearch = useCallback<NonNullable<EuiSearchBarProps['onChange']>>(
    ({ queryText }): void => {
      onSearch({ search: queryText });
    },
    [onSearch]
  );

  const handleAddException = useCallback(() => {
    // TODO: ASK YARA why we need to send the listType
    onAddExceptionClick(listType);
  }, [onAddExceptionClick, listType]);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={true}>
        <EuiSearchBar
          box={{
            placeholder: placeholdertext,
            incremental: false,
            schema: ITEMS_SCHEMA,
            'data-test-subj': `${dataTestSubj || ''}searchBar`,
          }}
          filters={filters}
          onChange={handleOnSearch}
        />
      </EuiFlexItem>
      {!canAddException && (
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj={`${dataTestSubj || ''}Button`}
            onClick={handleAddException}
            isDisabled={isSearching}
            fill={isButtonFilled}
            iconType={buttonIconType}
          >
            {addExceptionButtonText}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

SearchBarComponent.displayName = 'SearchBarComponent';

export const SearchBar = React.memo(SearchBarComponent);

SearchBar.displayName = 'SearchBar';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSearchBarProps } from '@elastic/eui';
import { EuiSearchBar } from '@elastic/eui';

import * as i18n from '../../translations';

interface ExceptionListsTableSearchProps {
  onSearch: (args: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]) => void;
  onInputChange?: (text: string) => void;
}

// TODO replace this component with the @Kbn/securitysolution-exception-list-components
export const EXCEPTIONS_SEARCH_SCHEMA = {
  strict: true,
  fields: {
    created_by: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    type: {
      type: 'string',
    },
    list_id: {
      type: 'string',
    },
    tags: {
      type: 'string',
    },
  },
};

export const ListsSearchBar = React.memo<ExceptionListsTableSearchProps>(
  ({ onSearch, onInputChange }) => {
    const handleWrapperInput = onInputChange
      ? (e: React.FormEvent<HTMLDivElement>) => {
          const input = e.target as HTMLInputElement;
          if (input.tagName === 'INPUT') {
            onInputChange(input.value);
          }
        }
      : undefined;

    return (
      // onInput captures raw keystrokes (including backspace) from the inner EuiSearchBar input
      // via React's synthetic event delegation, allowing the parent to track the current text
      // independently of whether the search has been "committed" (Enter / X button).
      <div onInput={handleWrapperInput}>
        <EuiSearchBar
          data-test-subj="exceptionsHeaderSearch"
          aria-label={i18n.EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER}
          onChange={onSearch}
          box={{
            [`data-test-subj`]: 'exceptionsHeaderSearchInput',
            placeholder: i18n.EXCEPTION_LIST_SEARCH_PLACEHOLDER,
            incremental: false,
            schema: EXCEPTIONS_SEARCH_SCHEMA,
          }}
        />
      </div>
    );
  }
);

ListsSearchBar.displayName = 'ListsSearchBar';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent, ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { EuiFieldSearchProps } from '@elastic/eui';
import { EuiFieldSearch, EuiFlexItem, EuiInputPopover } from '@elastic/eui';
import * as i18n from '../../../../common/translations';

const SearchBarWrapper = styled(EuiFlexItem)`
  min-width: 200px;
  & .euiPopover {
    // This is needed to "cancel" styles passed down from EuiTourStep that
    // interfere with EuiFieldSearch and don't allow it to take the full width
    display: block;
  }
`;

const SUGGESTIONS_SELECTOR = '[data-rule-search-suggestions]';

interface RuleSearchFieldProps {
  initialValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  prepend?: EuiFieldSearchProps['prepend'];
  /** Shown under the empty box while it has the focus. */
  suggestions?: ReactNode;
}

export function RuleSearchField({
  initialValue,
  onSearch,
  placeholder,
  prepend,
  suggestions,
}: RuleSearchFieldProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const [searchText, setSearchText] = useState(initialValue);
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value),
    [setSearchText]
  );

  useEffect(() => {
    setSearchText(initialValue);
    setIsFocused(false);
  }, [initialValue]);

  const field = (
    <EuiFieldSearch
      aria-label={i18n.SEARCH_RULES}
      fullWidth
      incremental={false}
      placeholder={placeholder ?? i18n.SEARCH_PLACEHOLDER}
      value={searchText}
      onChange={handleChange}
      onSearch={onSearch}
      onFocus={() => setIsFocused(true)}
      onClick={() => setIsFocused(true)}
      onBlur={(event) => {
        // A click on a suggestion moves the focus into the suggestions: keep them open for it.
        if (!(event.relatedTarget as HTMLElement | null)?.closest(SUGGESTIONS_SELECTOR)) {
          setIsFocused(false);
        }
      }}
      prepend={prepend}
      data-test-subj="ruleSearchField"
    />
  );

  return (
    <SearchBarWrapper grow>
      {suggestions ? (
        <EuiInputPopover
          fullWidth
          input={field}
          isOpen={isFocused && !searchText}
          closePopover={() => setIsFocused(false)}
          disableFocusTrap
          panelPaddingSize="s"
        >
          <div data-rule-search-suggestions>{suggestions}</div>
        </EuiInputPopover>
      ) : (
        field
      )}
    </SearchBarWrapper>
  );
}

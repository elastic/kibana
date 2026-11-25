/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';

/** One line above the table while there is a search text: what the table shows. */
export const SearchModeLine = () => {
  const {
    state: { filterOptions, searchMode, pagination, isFetching },
  } = useRulesTableContext();
  if (!filterOptions.filter.trim() || !searchMode || isFetching) {
    return null;
  }
  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        data-test-subj="ruleSearchModeLine"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={searchMode === 'semantic' ? 'sparkles' : 'magnify'}
            size="s"
            color="subdued"
            aria-hidden
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {searchMode === 'semantic' ? i18n.BEST_MATCHES(pagination.total) : i18n.EXACT_MATCHES}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </>
  );
};

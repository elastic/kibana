/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { searchBoxMode, useRuleSearchStatus } from './use_rule_search_status';
import * as i18n from './translations';

/**
 * One line above the table while there is a search text: which search ran and what the table
 * shows. A search by meaning that failed says so, and the table shows the keyword results.
 */
export const SearchModeLine = () => {
  const {
    state: { filterOptions, searchMode, searchFallbackReason, isPreviousData, isFetching },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const status = useRuleSearchStatus();
  const { euiTheme } = useEuiTheme();
  const text = filterOptions.filter.trim();
  if (!text) {
    return null;
  }
  if (isPreviousData || (!searchMode && isFetching)) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiSpacer size="xs" />
      </>
    );
  }
  if (!searchMode) {
    return null;
  }
  const failed =
    searchMode === 'legacy' &&
    searchBoxMode(status, filterOptions.searchMode) === 'ai' &&
    (searchFallbackReason === 'error' || searchFallbackReason === 'no_model');
  return (
    <>
      {failed && (
        <>
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={i18n.AI_UNAVAILABLE}
            data-test-subj="ruleSearchAiUnavailable"
          />
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        css={{ minBlockSize: euiTheme.size.l }}
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
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {searchMode === 'semantic' ? i18n.AI_SEARCH_ORDER : i18n.KEYWORD_SEARCH_MODE}
          </EuiText>
        </EuiFlexItem>
        {searchMode === 'semantic' && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="both"
              onClick={() => setFilterOptions({ searchMode: 'keyword' })}
              data-test-subj="ruleSearchUseKeyword"
            >
              {i18n.NEED_EVERY_MATCH}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </>
  );
};

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
    state: { filterOptions, searchMode, searchFallbackReason, pagination, isFetching },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const status = useRuleSearchStatus();
  const text = filterOptions.filter.trim();
  const { similarTo } = filterOptions;
  if ((!text && !similarTo) || !searchMode || isFetching) {
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
            {similarTo
              ? i18n.SIMILAR_RESULTS(pagination.total, similarTo.name)
              : searchMode === 'semantic'
              ? i18n.AI_RESULTS(pagination.total)
              : i18n.KEYWORD_RESULTS(pagination.total, text)}
          </EuiText>
        </EuiFlexItem>
        {similarTo && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="both"
              iconType="cross"
              onClick={() => setFilterOptions({ similarTo: undefined })}
              data-test-subj="ruleSearchClearSimilar"
            >
              {i18n.CLEAR_SIMILAR}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {searchMode === 'semantic' && !similarTo && (
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

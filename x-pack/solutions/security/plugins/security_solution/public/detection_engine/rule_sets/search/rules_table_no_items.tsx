/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { hasRuleSetConditions } from '../../../../common/detection_engine/rule_sets/rule_set_conditions';
import { fetchSearchRules } from '../../rule_management/api/api';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as tableI18n from '../../common/translations';
import { ruleQueryParams } from '../table_query';
import * as i18n from './translations';

/**
 * The empty rules table. After a search by meaning with no match it offers ways forward: the
 * rules that contain the text, the search without the facets, and example descriptions.
 */
export const RulesTableNoItems = () => {
  const {
    state: { filterOptions, searchMode },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const text = filterOptions.filter.trim();
  const { similarTo } = filterOptions;
  const afterAiSearch = searchMode === 'semantic' && text !== '' && !similarTo;
  const keywordParams = ruleQueryParams({ ...filterOptions, searchMode: 'keyword' });
  const { data: keywordTotal } = useQuery(
    ['ruleSearchKeywordTotal', keywordParams],
    async ({ signal }) =>
      (
        await fetchSearchRules({
          fields: ['id'],
          pagination: { page: 1, perPage: 1 },
          ...keywordParams,
          signal,
        })
      ).total,
    { enabled: afterAiSearch, refetchOnWindowFocus: false }
  );

  if (similarTo && searchMode === 'semantic') {
    return <EuiEmptyPrompt titleSize="xs" title={<h3>{i18n.NO_SIMILAR(similarTo.name)}</h3>} />;
  }
  if (!afterAiSearch) {
    return (
      <EuiEmptyPrompt
        title={<h3>{tableI18n.NO_RULES}</h3>}
        titleSize="xs"
        body={tableI18n.NO_RULES_BODY}
      />
    );
  }
  const hasFacets =
    !filterOptions.ruleSetId &&
    filterOptions.conditions !== undefined &&
    hasRuleSetConditions(filterOptions.conditions);

  return (
    <EuiEmptyPrompt
      titleSize="xs"
      title={<h3>{i18n.NO_AI_MATCHES(text)}</h3>}
      data-test-subj="ruleSearchNoResults"
      body={
        <>
          {keywordTotal !== undefined &&
            (keywordTotal > 0 ? (
              <EuiButtonEmpty
                size="s"
                onClick={() => setFilterOptions({ searchMode: 'keyword' })}
                data-test-subj="ruleSearchNoResultsKeyword"
              >
                {i18n.SHOW_KEYWORD_MATCHES(keywordTotal)}
              </EuiButtonEmpty>
            ) : (
              <EuiText size="s" color="subdued">
                {i18n.NO_KEYWORD_MATCHES}
              </EuiText>
            ))}
          {hasFacets && (
            <EuiButtonEmpty
              size="s"
              onClick={() => setFilterOptions({ conditions: {} })}
              data-test-subj="ruleSearchNoResultsWithoutFilters"
            >
              {i18n.SEARCH_WITHOUT_FILTERS}
            </EuiButtonEmpty>
          )}
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            {i18n.TRY_EXAMPLES}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" justifyContent="center" wrap responsive={false}>
            {i18n.EXAMPLE_QUERIES.map((example) => (
              <EuiFlexItem grow={false} key={example}>
                <EuiButtonEmpty
                  size="s"
                  iconType="sparkles"
                  onClick={() => setFilterOptions({ filter: example, members: undefined })}
                  data-test-subj="ruleSearchExample"
                >
                  {example}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      }
    />
  );
};

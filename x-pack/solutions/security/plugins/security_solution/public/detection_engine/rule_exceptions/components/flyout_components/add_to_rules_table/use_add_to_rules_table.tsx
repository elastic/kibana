/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { sortBy } from 'lodash';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  HorizontalAlignment,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as myI18n from './translations';
import * as commonI18n from '../translations';

import { getRulesTableColumn } from '../utils';
import { LinkRuleSwitch } from './link_rule_switch';
import { useFindRules } from '../../../../rule_management/logic/use_find_rules';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model';

export interface ExceptionsAddToRulesComponentProps {
  initiallySelectedRules?: RuleResponse[];
  onRuleSelectionChange: (rulesSelectedToAdd: RuleResponse[]) => void;
}
export const useAddToRulesTable = ({
  initiallySelectedRules,
  onRuleSelectionChange,
}: ExceptionsAddToRulesComponentProps) => {
  const { data: { rules } = { rules: [], total: 0 }, isFetched } = useFindRules({
    filterOptions: {
      filter: '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sortingOptions: undefined,
    pagination: {
      page: 1,
      perPage: 10000,
    },
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    initialPageSize: 25,
    showPerPageOptions: false,
  });

  const [linkedRules, setLinkedRules] = useState<RuleResponse[]>(initiallySelectedRules || []);
  useEffect(() => {
    onRuleSelectionChange(linkedRules);
  }, [linkedRules, onRuleSelectionChange]);

  const sortedRulesByLinkedRulesOnTop = useMemo(
    () =>
      sortBy(rules, [
        (rule) => {
          return initiallySelectedRules?.find((initRule) => initRule.id === rule.id);
        },
      ]),
    [initiallySelectedRules, rules]
  );

  const tagOptions = useMemo(() => {
    const uniqueTags = sortedRulesByLinkedRulesOnTop.reduce(
      (acc: Set<string>, item: RuleResponse) => {
        const { tags } = item;

        tags.forEach((tag) => acc.add(tag));
        return acc;
      },
      new Set()
    );
    return Array.from(uniqueTags).map((tag) => ({ value: tag, name: tag, field: 'tags' }));
  }, [sortedRulesByLinkedRulesOnTop]);

  const searchOptions = useMemo(
    () => ({
      box: {
        incremental: true,
        schema: true,
      },
      filters: [
        {
          type: 'field_value_selection' as const,
          operator: 'exact',
          name: i18n.translate(
            'xpack.securitySolution.exceptions.addToRulesTable.tagsFilterLabel',
            {
              defaultMessage: 'Tags',
            }
          ),
          multiSelect: 'or' as const,
          options: tagOptions,
        },
      ],
    }),
    [tagOptions]
  );

  const rulesTableColumnsWithLinkSwitch: Array<EuiBasicTableColumn<RuleResponse>> = useMemo(
    () => [
      {
        field: 'link',
        name: commonI18n.LINK_COLUMN,
        align: 'left' as HorizontalAlignment,
        'data-test-subj': 'ruleActionLinkRuleSwitch',
        render: (_: unknown, rule: RuleResponse) => (
          <LinkRuleSwitch rule={rule} linkedRules={linkedRules} onRuleLinkChange={setLinkedRules} />
        ),
      },
      ...getRulesTableColumn(),
    ],
    [linkedRules]
  );
  const onTableChange = useCallback(
    ({ page: { index } }: CriteriaWithPagination<never>) =>
      setPagination({ ...pagination, pageIndex: index }),
    [pagination]
  );
  return {
    isLoading: !isFetched,
    pagination,
    searchOptions,
    sortedRulesByLinkedRulesOnTop,
    rulesTableColumnsWithLinkSwitch,
    addToSelectedRulesDescription: myI18n.ADD_TO_SELECTED_RULES_DESCRIPTION,
    onTableChange,
  };
};

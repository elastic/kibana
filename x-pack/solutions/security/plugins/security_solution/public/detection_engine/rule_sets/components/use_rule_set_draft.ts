/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRuleSetsQuery } from '../api';
import { ruleSetFilterState } from '../table_query';

/**
 * Applies the saved facets when opening a set from the switcher, a link, or a reload.
 * A reload restores the saved facets and keeps the current text search.
 */
export const useRuleSetDraft = () => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data: sets } = useRuleSetsQuery();
  const set = sets?.find(({ id }) => id === filterOptions.ruleSetId);

  useEffect(() => {
    if (set && filterOptions.draftOf !== set.id) {
      const { conditions, draftOf } = ruleSetFilterState(set);
      setFilterOptions({ conditions, draftOf });
    }
  }, [set, filterOptions.draftOf, setFilterOptions]);
};

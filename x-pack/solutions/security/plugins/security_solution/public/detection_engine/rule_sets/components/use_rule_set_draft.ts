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
 * Puts the saved conditions of the selected set into the facets and the search, whenever a set
 * is selected without them: from the switcher, a link (an AI card), or a page reload. A reload
 * drops an unsaved change, like leaving the set.
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
      setFilterOptions(ruleSetFilterState(set));
    }
  }, [set, filterOptions.draftOf, setFilterOptions]);
};

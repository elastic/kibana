/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks';
import { useKibana } from '../utils/kibana_react';
import { useGetFilteredRuleTypes } from './use_get_filtered_rule_types';

export function useGetAvailableRulesWithDescriptions() {
  const filteredRuleTypes = useGetFilteredRuleTypes();

  const {
    triggersActionsUi: { ruleTypeRegistry },
    http,
    notifications: { toasts },
  } = useKibana().services;

  const {
    ruleTypesState: { data: ruleTypes },
  } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes,
  });

  return useMemo(() => {
    const ruleTypesFromRuleTypeRegistry = ruleTypeRegistry.list();

    return Array.from(ruleTypes).map(([id, rule]) => {
      return {
        id,
        name: rule.name,
        description: ruleTypesFromRuleTypeRegistry.find((f) => f.id === id)?.description || '',
      };
    });
  }, [ruleTypeRegistry, ruleTypes]);
}

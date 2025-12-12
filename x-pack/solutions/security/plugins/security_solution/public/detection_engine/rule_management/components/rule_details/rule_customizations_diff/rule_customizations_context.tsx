/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import { useRuleCustomizationsDiff } from './use_rule_customizations_diff';

export interface RuleCustomizationsState {
  doesBaseVersionExist: boolean;
  isLoading: boolean;
  modifiedFields: Set<string>;
}

export interface RuleCustomizationsActions {
  openCustomizationsPreviewFlyout: () => void;
  openCustomizationsRevertFlyout: () => void;
}

export interface RuleCustomizationsContextType {
  state: RuleCustomizationsState;
  actions: RuleCustomizationsActions;
}

export const RuleCustomizationsContext = createContext<RuleCustomizationsContextType | null>(null);

interface RuleCustomizationsContextProviderProps {
  rule: RuleResponse | null;
  children: React.ReactNode;
}

export const RuleCustomizationsContextProvider = ({
  rule,
  children,
}: RuleCustomizationsContextProviderProps) => {
  const {
    ruleCustomizationsFlyout,
    openCustomizationsPreviewFlyout,
    openCustomizationsRevertFlyout,
    doesBaseVersionExist,
    isLoading,
    modifiedFields,
  } = useRuleCustomizationsDiff({ rule });

  const actions = useMemo<RuleCustomizationsActions>(
    () => ({
      openCustomizationsPreviewFlyout,
      openCustomizationsRevertFlyout,
    }),
    [openCustomizationsPreviewFlyout, openCustomizationsRevertFlyout]
  );

  const providerValue = useMemo<RuleCustomizationsContextType>(
    () => ({
      state: {
        isLoading,
        doesBaseVersionExist,
        modifiedFields,
      },
      actions,
    }),
    [actions, doesBaseVersionExist, isLoading, modifiedFields]
  );

  return (
    <RuleCustomizationsContext.Provider value={providerValue}>
      <>
        {children}
        {ruleCustomizationsFlyout}
      </>
    </RuleCustomizationsContext.Provider>
  );
};

export const useRuleCustomizationsContext = (): RuleCustomizationsContextType => {
  const ruleCustomizationsContext = useContext(RuleCustomizationsContext);
  invariant(
    ruleCustomizationsContext,
    'useRuleCustomizationsContext should be used inside RuleCustomizationsContextProvider'
  );

  return ruleCustomizationsContext;
};

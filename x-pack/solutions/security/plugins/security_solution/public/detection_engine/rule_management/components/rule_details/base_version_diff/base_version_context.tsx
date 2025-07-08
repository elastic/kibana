/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import { usePrebuiltRulesViewBaseDiff } from './use_prebuilt_rules_view_base_diff';

export interface PrebuiltRuleBaseVersionState {
  doesBaseVersionExist: boolean;
  isLoading: boolean;
  modifiedFields: Set<string>;
}

export interface PrebuiltRuleBaseVersionActions {
  openCustomizationsPreviewFlyout: () => void;
  openCustomizationsRevertFlyout: () => void;
  setBaseVersionRule: Dispatch<SetStateAction<RuleResponse | null>>;
}

export interface PrebuiltRuleBaseVersionContextType {
  state: PrebuiltRuleBaseVersionState;
  actions: PrebuiltRuleBaseVersionActions;
}

const PrebuiltRuleBaseVersionContext = createContext<PrebuiltRuleBaseVersionContextType | null>(
  null
);

interface PrebuiltRuleBaseVersionFlyoutContextProviderProps {
  children: React.ReactNode;
}

export const PrebuiltRuleBaseVersionFlyoutContextProvider = ({
  children,
}: PrebuiltRuleBaseVersionFlyoutContextProviderProps) => {
  const [rule, setRule] = useState<RuleResponse | null>(null);

  const {
    baseVersionFlyout,
    openCustomizationsPreviewFlyout,
    openCustomizationsRevertFlyout,
    doesBaseVersionExist,
    isLoading,
    modifiedFields,
  } = usePrebuiltRulesViewBaseDiff({ rule });

  const actions = useMemo<PrebuiltRuleBaseVersionActions>(
    () => ({
      openCustomizationsPreviewFlyout,
      openCustomizationsRevertFlyout,
      setBaseVersionRule: setRule,
    }),
    [openCustomizationsPreviewFlyout, openCustomizationsRevertFlyout]
  );

  const providerValue = useMemo<PrebuiltRuleBaseVersionContextType>(
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
    <PrebuiltRuleBaseVersionContext.Provider value={providerValue}>
      <>
        {children}
        {baseVersionFlyout}
      </>
    </PrebuiltRuleBaseVersionContext.Provider>
  );
};

export const usePrebuiltRuleBaseVersionContext = (): PrebuiltRuleBaseVersionContextType => {
  const prebuiltRuleBaseVersionContext = useContext(PrebuiltRuleBaseVersionContext);
  invariant(
    prebuiltRuleBaseVersionContext,
    'usePrebuiltRuleBaseVersionContext should be used inside PrebuiltRuleBaseVersionFlyoutContextProvider'
  );

  return prebuiltRuleBaseVersionContext;
};

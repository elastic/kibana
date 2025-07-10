/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invariant } from '@formatjs/intl-utils';
import useSet from 'react-use/lib/useSet';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';

export interface RulePreviewContextType {
  /**
   * Sets the rule is being edited in the rule upgrade flyout
   */
  setFieldEditing: (fieldName: string) => void;

  /**
   * Sets the rule is not being edited in the rule upgrade flyout
   */
  setFieldReadonly: (fieldName: string) => void;

  /**
   * Returns whether the rule is being edited in the rule upgrade flyout
   */
  isEditingRule: boolean;
}

const RulePreviewContext = createContext<RulePreviewContextType | null>(null);

interface RulePreviewContextProviderProps {
  children: React.ReactNode;
  ruleId: string | undefined;
}

export function RulePreviewContextProvider({ children, ruleId }: RulePreviewContextProviderProps) {
  const [editedFields, { add, remove, reset }] = useSet<string>();
  const prevRuleId = usePrevious(ruleId);

  useEffect(() => {
    if (ruleId !== prevRuleId) {
      reset();
    }
  }, [reset, ruleId, prevRuleId]);

  const isEditingRule = editedFields.size > 0;

  const contextValue: RulePreviewContextType = useMemo(
    () => ({
      isEditingRule,
      setFieldEditing: add,
      setFieldReadonly: remove,
    }),
    [isEditingRule, add, remove]
  );

  return <RulePreviewContext.Provider value={contextValue}>{children}</RulePreviewContext.Provider>;
}

export function useRulePreviewContext() {
  const context = useContext(RulePreviewContext);

  invariant(
    context !== null,
    'useRulePreviewContext must be used inside a RulePreviewContextProvider'
  );

  return context;
}

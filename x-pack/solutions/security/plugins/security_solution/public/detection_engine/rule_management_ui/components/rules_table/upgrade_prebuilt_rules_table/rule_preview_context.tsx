/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invariant } from '@formatjs/intl-utils';
import useSet from 'react-use/lib/useSet';
import React, { createContext, useContext, useMemo } from 'react';

export interface RulePreviewContextType {
  /**
   * Sets the rule is being edited in the rule upgrade flyout
   */
  setRuleIsEdited: (editing: boolean) => void;

  /**
   * Returns whether the rule is being edited in the rule upgrade flyout
   */
  isRuleEdited: boolean;
}

const RulePreviewContext = createContext<RulePreviewContextType | null>(null);

interface RulePreviewContextProviderProps {
  children: React.ReactNode;
}

export function RulePreviewContextProvider({ children }: RulePreviewContextProviderProps) {
  const [editedFields, { add, remove }] = useSet(new Set([]));

  const contextValue: RulePreviewContextType = useMemo(
    () => ({
      isEditingRule: editedFields.size > 0,
      setFieldEditing: add,
      setFieldReadonly: remove,
    }),
    [editedFields.size, add, remove]
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
